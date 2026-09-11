import { useEffect, useRef, useState } from "react";

import type {
  MidiInputSummary,
  MidiLearnedControl,
  MidiStatus
} from "../components/tools/ActionsTool";
import {
  isEditableHotkeyTarget,
  loadActionBindings,
  saveActionBindings,
  sortActionBindings,
  type ActionBinding,
  type ActionBindingAction
} from "../lib/actionBindings";
import { saveFastSlots, type FastSlot } from "../lib/api";
import { clearFastSlot, replaceFastSlot, sortFastSlots, visibleFastSlots } from "../lib/fastSlots";
import {
  formatMidiMessageLabel,
  isMidiSupported,
  loadMidiBindings,
  midiMessageKey,
  parseMidiMessage,
  saveMidiBindings,
  sortMidiBindings,
  type MidiBinding
} from "../lib/midiBindings";

type MidiInputLike = {
  id?: string;
  name?: string | null;
  onmidimessage: ((event: { data: ArrayLike<number> }) => void) | null;
};
type MidiAccessLike = {
  inputs: {
    values: () => Iterable<MidiInputLike>;
  };
};

export type UseBindingsOptions = {
  // Where hotkey and MIDI bindings are stored: they belong to the browser and the world.
  worldKey: string;
  // Runs a bound action; `report` receives an error message, or null when it succeeded.
  execute: (action: ActionBindingAction, report: (message: string | null) => void) => Promise<void>;
  // Called when a hotkey or MIDI binding fails, so the user sees why.
  onBindingError: () => void;
};

// Everything that turns an input into an action: fast slots, hotkey bindings and MIDI.
export function useBindings({ worldKey, execute, onBindingError }: UseBindingsOptions) {
  const [fastSlots, setFastSlots] = useState<FastSlot[]>([]);
  const [fastSlotError, setFastSlotError] = useState<string | null>(null);
  const [actionBindings, setActionBindings] = useState<ActionBinding[]>([]);
  const [actionBindingMessage, setActionBindingMessage] = useState<string | null>(null);
  const [midiBindings, setMidiBindings] = useState<MidiBinding[]>([]);
  const [midiBindingMessage, setMidiBindingMessage] = useState<string | null>(null);
  const [midiInputs, setMidiInputs] = useState<MidiInputSummary[]>([]);
  const [midiLearnedControl, setMidiLearnedControl] = useState<MidiLearnedControl | null>(null);
  const [midiLearning, setMidiLearning] = useState(false);
  const [midiStatus, setMidiStatus] = useState<MidiStatus>(() =>
    isMidiSupported(typeof navigator === "undefined" ? null : navigator)
      ? { status: "idle", message: "MIDI is not connected." }
      : { status: "unsupported", message: "Web MIDI is not available in this browser." }
  );
  // Bumped on every fast-slot edit so a load that started earlier cannot overwrite it.
  const fastSlotsRevision = useRef(0);
  const midiBindingsRef = useRef<MidiBinding[]>([]);
  const midiInputsRef = useRef<MidiInputLike[]>([]);
  const midiLearningRef = useRef(false);
  const midiTriggerRef = useRef<(binding: MidiBinding) => void>(() => {});

  useEffect(() => {
    setActionBindings(loadActionBindings(worldKey));
    setActionBindingMessage(null);
  }, [worldKey]);

  useEffect(() => {
    const loaded = loadMidiBindings(worldKey);
    setMidiBindings(loaded);
    midiBindingsRef.current = loaded;
    setMidiBindingMessage(null);
    setMidiLearnedControl(null);
    setMidiLearning(false);
    midiLearningRef.current = false;
  }, [worldKey]);

  useEffect(() => {
    midiBindingsRef.current = midiBindings;
  }, [midiBindings]);

  useEffect(() => {
    midiLearningRef.current = midiLearning;
  }, [midiLearning]);

  useEffect(() => {
    midiTriggerRef.current = (binding: MidiBinding) => {
      void handleMidiBindingTrigger(binding);
    };
  });

  useEffect(() => {
    return () => {
      midiInputsRef.current.forEach((input) => {
        input.onmidimessage = null;
      });
    };
  }, []);

  // Take fast slots loaded with the world. With `loadedAtRevision`, only if none were edited
  // since that load started.
  function adoptFastSlots(slots: FastSlot[], loadedAtRevision?: number) {
    if (loadedAtRevision === undefined || fastSlotsRevision.current === loadedAtRevision) {
      setFastSlots(visibleFastSlots(slots));
    }
  }

  function fastSlotsRevisionNow() {
    return fastSlotsRevision.current;
  }

  function saveFastSlotList(nextSlots: FastSlot[]) {
    const sorted = sortFastSlots(nextSlots);
    fastSlotsRevision.current += 1;
    setFastSlots(sorted);
    void saveFastSlots(sorted)
      .then((savedSlots) => {
        const visibleSavedSlots = visibleFastSlots(savedSlots);
        setFastSlots(visibleSavedSlots.length > 0 || sorted.length === 0 ? visibleSavedSlots : sorted);
      })
      .catch(() => {});
  }

  function handleSaveFastSlot(slot: FastSlot) {
    setFastSlotError(null);
    saveFastSlotList(replaceFastSlot(fastSlots, slot));
  }

  function handleClearFastSlot(position: number) {
    setFastSlotError(null);
    saveFastSlotList(clearFastSlot(fastSlots, position));
  }

  async function handleFastSlotTrigger(slot: FastSlot) {
    await execute(slot.action, setFastSlotError);
  }

  function saveActionBindingList(nextBindings: ActionBinding[]) {
    setActionBindings(saveActionBindings(worldKey, nextBindings));
  }

  function handleSaveActionBinding(binding: ActionBinding) {
    setActionBindingMessage(`Saved ${binding.label}`);
    saveActionBindingList(
      sortActionBindings([binding, ...actionBindings.filter((item) => item.id !== binding.id)])
    );
  }

  function handleDeleteActionBinding(bindingId: string) {
    setActionBindingMessage(null);
    saveActionBindingList(actionBindings.filter((binding) => binding.id !== bindingId));
  }

  async function handleActionBindingTrigger(binding: ActionBinding) {
    await execute(binding.action, (message) => {
      setActionBindingMessage(message);
      if (message) {
        onBindingError();
      }
    });
  }

  function handleSaveMidiBinding(binding: MidiBinding) {
    setMidiBindings((current) => {
      const next = saveMidiBindings(
        worldKey,
        sortMidiBindings([...current.filter((item) => item.id !== binding.id), binding])
      );
      midiBindingsRef.current = next;
      return next;
    });
    setMidiBindingMessage(`Saved ${binding.label}`);
  }

  function handleDeleteMidiBinding(bindingId: string) {
    setMidiBindings((current) => {
      const next = saveMidiBindings(
        worldKey,
        current.filter((binding) => binding.id !== bindingId)
      );
      midiBindingsRef.current = next;
      return next;
    });
    setMidiBindingMessage("Removed MIDI binding.");
  }

  async function handleMidiBindingTrigger(binding: MidiBinding) {
    await execute(binding.action, (message) => {
      setMidiBindingMessage(message);
      if (message) {
        onBindingError();
      }
    });
  }

  function handleClearMidiLearned() {
    setMidiLearnedControl(null);
    setMidiLearning(false);
    midiLearningRef.current = false;
  }

  function handleMidiInputMessage(input: MidiInputLike, data: ArrayLike<number>) {
    const message = parseMidiMessage(data);
    if (!message) {
      return;
    }
    const inputId = input.id ?? null;
    const inputName = input.name ?? null;
    if (midiLearningRef.current) {
      setMidiLearnedControl({ input_id: inputId, input_name: inputName, message });
      setMidiLearning(false);
      midiLearningRef.current = false;
      setMidiStatus({
        status: "connected",
        message: `Learned ${formatMidiMessageLabel(message)} from ${inputName || inputId || "MIDI input"}.`
      });
      return;
    }
    if (isEditableHotkeyTarget(document.activeElement as HTMLElement | null)) {
      return;
    }
    const messageKey = midiMessageKey(message);
    const binding = midiBindingsRef.current.find(
      (item) =>
        (item.input_id === null || item.input_id === inputId) &&
        midiMessageKey(item.message) === messageKey
    );
    if (binding) {
      midiTriggerRef.current(binding);
    }
  }

  async function handleConnectMidi() {
    if (!isMidiSupported(typeof navigator === "undefined" ? null : navigator)) {
      setMidiStatus({ status: "unsupported", message: "Web MIDI is not available in this browser." });
      return;
    }
    setMidiStatus({ status: "connecting", message: "Requesting MIDI access..." });
    try {
      const requestMIDIAccess = (
        navigator as Navigator & { requestMIDIAccess?: () => Promise<MidiAccessLike> }
      ).requestMIDIAccess;
      if (!requestMIDIAccess) {
        throw new Error("Web MIDI is not available.");
      }
      const access = await requestMIDIAccess.call(navigator);
      midiInputsRef.current.forEach((input) => {
        input.onmidimessage = null;
      });
      const inputs = Array.from(access.inputs.values());
      midiInputsRef.current = inputs;
      setMidiInputs(inputs.map((input) => ({ id: input.id ?? null, name: input.name ?? null })));
      inputs.forEach((input) => {
        input.onmidimessage = (event) => handleMidiInputMessage(input, event.data);
      });
      setMidiStatus({
        status: "connected",
        message:
          inputs.length > 0
            ? `Connected to ${inputs.map((input) => input.name || input.id || "MIDI input").join(", ")}.`
            : "MIDI connected, but no inputs were found."
      });
    } catch (error: unknown) {
      setMidiStatus({
        status: "error",
        message: error instanceof Error ? error.message : "MIDI permission was denied."
      });
    }
  }

  async function handleStartMidiLearn() {
    if (midiStatus.status === "unsupported") {
      return;
    }
    if (midiInputsRef.current.length === 0) {
      await handleConnectMidi();
      if (midiInputsRef.current.length === 0) {
        return;
      }
    }
    setMidiLearnedControl(null);
    setMidiBindingMessage(null);
    setMidiLearning(true);
    midiLearningRef.current = true;
    setMidiStatus({ status: "listening", message: "Listening for a MIDI note or control..." });
  }

  return {
    fastSlots,
    fastSlotError,
    actionBindings,
    actionBindingMessage,
    midiBindings,
    midiBindingMessage,
    midiInputs,
    midiLearnedControl,
    midiLearning,
    midiStatus,
    adoptFastSlots,
    fastSlotsRevisionNow,
    handleSaveFastSlot,
    handleClearFastSlot,
    handleFastSlotTrigger,
    handleSaveActionBinding,
    handleDeleteActionBinding,
    handleActionBindingTrigger,
    handleSaveMidiBinding,
    handleDeleteMidiBinding,
    handleMidiBindingTrigger,
    handleClearMidiLearned,
    handleConnectMidi,
    handleStartMidiLearn
  };
}
