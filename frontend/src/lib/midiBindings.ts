import type { ActionBindingAction } from "./actionBindings";

export type MidiMessage = {
  kind: "note" | "control";
  channel: number;
  number: number;
};

export type MidiBinding = {
  id: string;
  label: string;
  input_id: string | null;
  input_name: string | null;
  message: MidiMessage;
  action: ActionBindingAction;
};

export type MidiNavigatorLike = {
  requestMIDIAccess?: unknown;
};

export type MidiBindingDraft = {
  label: string;
  input_id?: string | null;
  message: MidiMessage | null;
  action: ActionBindingAction | null;
};

const STORAGE_PREFIX = "virtualscreen.midiBindings";

export function parseMidiMessage(data: ArrayLike<number> | null | undefined): MidiMessage | null {
  if (!data || data.length < 2) {
    return null;
  }

  const status = data[0];
  const data1 = data[1];
  const data2 = data.length > 2 ? data[2] : 0;
  const command = status & 0xf0;
  const channel = status & 0x0f;

  if (command === 0x90) {
    return data2 > 0 ? { kind: "note", channel, number: data1 } : null;
  }
  if (command === 0x80) {
    return null;
  }
  if (command === 0xb0) {
    return { kind: "control", channel, number: data1 };
  }
  return null;
}

export function formatMidiMessageLabel(message: MidiMessage): string {
  const kind = message.kind === "note" ? "Note" : "Control";
  return `${kind} ${message.number} ch ${message.channel + 1}`;
}

export function midiMessageKey(message: MidiMessage): string {
  return `${message.kind}:${message.channel}:${message.number}`;
}

export function duplicateMidiBinding(
  inputId: string | null | undefined,
  message: MidiMessage,
  bindings: MidiBinding[],
  ignoredBindingId?: string
): boolean {
  const key = midiMessageKey(message);
  const normalizedInputId = inputId ?? null;
  return bindings.some(
    (binding) =>
      binding.id !== ignoredBindingId &&
      (binding.input_id ?? null) === normalizedInputId &&
      midiMessageKey(binding.message) === key
  );
}

export function midiBindingValidationError(
  draft: MidiBindingDraft,
  bindings: MidiBinding[],
  ignoredBindingId?: string
): string | null {
  if (!draft.label.trim()) {
    return "Name the MIDI binding.";
  }
  if (!draft.message) {
    return "Learn a MIDI control.";
  }
  if (!draft.action) {
    return "Choose an action.";
  }
  if (duplicateMidiBinding(draft.input_id, draft.message, bindings, ignoredBindingId)) {
    return "MIDI control is already used.";
  }
  return null;
}

export function bindingStorageKey(worldKey: string): string {
  return `${STORAGE_PREFIX}.${worldKey}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMidiMessage(value: unknown): value is MidiMessage {
  if (!isRecord(value)) {
    return false;
  }
  const channel = value.channel;
  const number = value.number;
  return (
    (value.kind === "note" || value.kind === "control") &&
    typeof channel === "number" &&
    Number.isInteger(channel) &&
    channel >= 0 &&
    channel <= 15 &&
    typeof number === "number" &&
    Number.isInteger(number) &&
    number >= 0 &&
    number <= 127
  );
}

function isMidiBinding(value: unknown): value is MidiBinding {
  if (!isRecord(value) || !isMidiMessage(value.message) || !isRecord(value.action)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    (typeof value.input_id === "string" || value.input_id === null) &&
    (typeof value.input_name === "string" || value.input_name === null) &&
    typeof value.action.kind === "string"
  );
}

export function sortMidiBindings(bindings: MidiBinding[]): MidiBinding[] {
  return [...bindings].sort((a, b) => {
    const labelOrder = a.label.localeCompare(b.label);
    return labelOrder || formatMidiMessageLabel(a.message).localeCompare(formatMidiMessageLabel(b.message));
  });
}

export function loadMidiBindings(
  worldKey: string,
  storage: Storage = window.localStorage
): MidiBinding[] {
  const raw = storage.getItem(bindingStorageKey(worldKey));
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? sortMidiBindings(parsed.filter(isMidiBinding)) : [];
  } catch {
    return [];
  }
}

export function saveMidiBindings(
  worldKey: string,
  bindings: MidiBinding[],
  storage: Storage = window.localStorage
): MidiBinding[] {
  const sorted = sortMidiBindings(bindings);
  storage.setItem(bindingStorageKey(worldKey), JSON.stringify(sorted));
  return sorted;
}

export function clearMidiBindings(
  worldKey: string,
  storage: Storage = window.localStorage
): void {
  storage.removeItem(bindingStorageKey(worldKey));
}

export function isMidiSupported(navigatorLike: MidiNavigatorLike | null | undefined): boolean {
  return typeof navigatorLike?.requestMIDIAccess === "function";
}
