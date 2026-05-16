import { describe, expect, it } from "vitest";

import {
  bindingStorageKey,
  clearMidiBindings,
  duplicateMidiBinding,
  formatMidiMessageLabel,
  isMidiSupported,
  loadMidiBindings,
  midiBindingValidationError,
  midiMessageKey,
  parseMidiMessage,
  saveMidiBindings,
  sortMidiBindings
} from "./midiBindings";
import type { MidiBinding, MidiMessage } from "./midiBindings";

const noteMessage: MidiMessage = {
  kind: "note",
  channel: 0,
  number: 36
};

const controlMessage: MidiMessage = {
  kind: "control",
  channel: 0,
  number: 7
};

const binding: MidiBinding = {
  id: "midi-1",
  label: "Glass",
  input_id: "pad-1",
  input_name: "DM Pad",
  message: noteMessage,
  action: {
    kind: "audio_track",
    path: ".music/effects/glass.wav",
    bus: "effect",
    play: true
  }
};

function fakeStorage(initialValues: Record<string, string> = {}): Storage {
  const values = new Map<string, string>(Object.entries(initialValues));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}

describe("MIDI binding helpers", () => {
  it("parses note-on and control-change MIDI messages", () => {
    expect(parseMidiMessage([0x90, 36, 100])).toEqual(noteMessage);
    expect(parseMidiMessage(new Uint8Array([0x91, 40, 1]))).toEqual({
      kind: "note",
      channel: 1,
      number: 40
    });
    expect(parseMidiMessage([0xb0, 7, 127])).toEqual(controlMessage);
  });

  it("ignores note-off, zero-velocity note-on, and unrelated MIDI messages", () => {
    expect(parseMidiMessage([0x80, 36, 100])).toBeNull();
    expect(parseMidiMessage([0x90, 36, 0])).toBeNull();
    expect(parseMidiMessage([0xc0, 1, 0])).toBeNull();
    expect(parseMidiMessage([0x90])).toBeNull();
  });

  it("formats MIDI messages and stable keys", () => {
    expect(formatMidiMessageLabel(noteMessage)).toBe("Note 36 ch 1");
    expect(formatMidiMessageLabel(controlMessage)).toBe("Control 7 ch 1");
    expect(midiMessageKey(noteMessage)).toBe("note:0:36");
    expect(midiMessageKey(controlMessage)).toBe("control:0:7");
  });

  it("detects duplicate bindings by input and message", () => {
    expect(duplicateMidiBinding("pad-1", noteMessage, [binding])).toBe(true);
    expect(duplicateMidiBinding("pad-1", noteMessage, [binding], "midi-1")).toBe(false);
    expect(duplicateMidiBinding("pad-2", noteMessage, [binding])).toBe(false);
    expect(duplicateMidiBinding("pad-1", controlMessage, [binding])).toBe(false);
  });

  it("validates required label, message, action, and duplicate message", () => {
    expect(midiBindingValidationError({ label: "", message: noteMessage, action: binding.action }, [])).toBe(
      "Name the MIDI binding."
    );
    expect(midiBindingValidationError({ label: "Glass", message: null, action: binding.action }, [])).toBe(
      "Learn a MIDI control."
    );
    expect(midiBindingValidationError({ label: "Glass", message: noteMessage, action: null }, [])).toBe(
      "Choose an action."
    );
    expect(
      midiBindingValidationError(
        { label: "Glass", input_id: "pad-1", message: noteMessage, action: binding.action },
        [binding]
      )
    ).toBe("MIDI control is already used.");
    expect(
      midiBindingValidationError(
        { label: "Glass", input_id: "pad-1", message: noteMessage, action: binding.action },
        [binding],
        "midi-1"
      )
    ).toBeNull();
  });

  it("stores MIDI bindings per world and filters malformed stored values", () => {
    const storage = fakeStorage();
    const key = bindingStorageKey("sample-world");
    expect(key).toBe("virtualscreen.midiBindings.sample-world");

    saveMidiBindings("sample-world", [binding], storage);
    expect(loadMidiBindings("sample-world", storage)).toEqual([binding]);
    expect(loadMidiBindings("other-world", storage)).toEqual([]);

    storage.setItem(
      key,
      JSON.stringify([
        binding,
        { id: "bad-message", label: "Bad", message: { kind: "note", channel: "0", number: 36 }, action: binding.action },
        { id: "bad-action", label: "Bad", message: noteMessage, action: {} }
      ])
    );
    expect(loadMidiBindings("sample-world", storage)).toEqual([binding]);

    clearMidiBindings("sample-world", storage);
    expect(loadMidiBindings("sample-world", storage)).toEqual([]);
  });

  it("sorts bindings by label and then message label", () => {
    const sorted = sortMidiBindings([
      { ...binding, id: "b", label: "Screen", message: noteMessage },
      { ...binding, id: "a", label: "Audio", message: { kind: "note", channel: 0, number: 40 } },
      { ...binding, id: "c", label: "Audio", message: controlMessage }
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("detects Web MIDI support on navigator-like objects", () => {
    expect(isMidiSupported({ requestMIDIAccess: () => Promise.resolve({}) })).toBe(true);
    expect(isMidiSupported({})).toBe(false);
    expect(isMidiSupported(null)).toBe(false);
  });
});
