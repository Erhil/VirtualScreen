import { describe, expect, it } from "vitest";

import type { AudioTrack } from "./api";
import {
  advanceAudioQueue,
  audioFadeProgress,
  audioQueueLabel,
  audioSummary,
  cancelAudioFade,
  createPlaylistExpansionState,
  createAudioMixerState,
  displayAudioTrackTitle,
  finishAudioFade,
  groupAudioTracks,
  groupAudioTracksByBus,
  hasLoadedAudio,
  togglePlaylistExpansion,
  loadAudioTrack,
  loadAudioPlaylist,
  rewindAudioQueue,
  setAudioBusLoop,
  setAudioBusPlaying,
  setAudioPlaylistLoop,
  setAudioBusVolume,
  startAudioFade,
  stopAllAudio,
  stopAudioBus
} from "./audio";

function track(path: string, bus: AudioTrack["bus"], playlist: string | null = null): AudioTrack {
  const name = path.split("/").at(-1) ?? path;
  return {
    path,
    name,
    title: name.replace(/\.[^.]+$/, ""),
    bus,
    playlist,
    extension: name.split(".").at(-1) ?? "",
    content_type: "audio/mpeg",
    size: 8,
    modified_at: "2026-05-09T12:00:00Z"
  };
}

describe("audio mixer helpers", () => {
  it("loads a track into its matching bus without autoplaying", () => {
    const state = loadAudioTrack(
      createAudioMixerState(),
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern")
    );

    expect(state.ambient.track?.title).toBe("crowd");
    expect(state.ambient.playing).toBe(false);
    expect(audioSummary(state)).toBe("1 loaded");
    expect(hasLoadedAudio(state)).toBe(true);
  });

  it("plays and stops independent buses", () => {
    let state = createAudioMixerState();
    state = loadAudioTrack(state, track(".music/ambient/Tavern/crowd.mp3", "ambient"));
    state = loadAudioTrack(state, track(".music/music/bard.ogg", "music"));
    state = loadAudioTrack(state, track(".music/effects/glass.wav", "effect"));
    state = setAudioBusPlaying(state, "ambient", true);
    state = setAudioBusPlaying(state, "music", true);
    state = setAudioBusPlaying(state, "effect", true);
    state = stopAudioBus(state, "effect");

    expect(state.ambient.playing).toBe(true);
    expect(state.music.playing).toBe(true);
    expect(state.effect.track).toBeNull();
    expect(audioSummary(state)).toBe("2 playing");
  });

  it("clamps volume and stores loop per bus", () => {
    let state = createAudioMixerState();
    state = setAudioBusVolume(state, "ambient", 2);
    state = setAudioBusVolume(state, "music", -1);
    state = setAudioBusLoop(state, "effect", true);

    expect(state.ambient.volume).toBe(1);
    expect(state.music.volume).toBe(0);
    expect(state.effect.loop).toBe(true);
  });

  it("stop all clears every bus", () => {
    let state = createAudioMixerState();
    state = loadAudioTrack(state, track(".music/ambient/Tavern/crowd.mp3", "ambient"));
    state = loadAudioTrack(state, track(".music/music/bard.ogg", "music"));

    expect(hasLoadedAudio(stopAllAudio(state))).toBe(false);
  });

  it("groups tracks by bus and playlist", () => {
    const groups = groupAudioTracks([
      track(".music/effects/glass.wav", "effect", null),
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern"),
      track(".music/ambient/Rain/rain.mp3", "ambient", "Rain")
    ]);

    expect(groups.map((group) => `${group.bus}:${group.playlist ?? "none"}`)).toEqual([
      "ambient:Rain",
      "ambient:Tavern",
      "effect:none"
    ]);
  });

  it("groups tracks inside each bus for compact playlist rendering", () => {
    const groups = groupAudioTracksByBus([
      track(".music/effects/glass.wav", "effect", null),
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern"),
      track(".music/ambient/Tavern/laughter.mp3", "ambient", "Tavern"),
      track(".music/music/Bard/song.ogg", "music", "Bard")
    ]);

    expect(groups.ambient.map((group) => group.playlist)).toEqual(["Tavern"]);
    expect(groups.ambient[0].tracks).toHaveLength(2);
    expect(groups.music.map((group) => group.playlist)).toEqual(["Bard"]);
    expect(groups.effect.map((group) => group.playlist)).toEqual([null]);
  });

  it("tracks independent playlist expansion state", () => {
    const initial = createPlaylistExpansionState(
      groupAudioTracksByBus([track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern")]),
      ""
    );
    const opened = togglePlaylistExpansion(initial, "ambient", "Tavern");

    expect(initial["ambient:Tavern"]).toBe(false);
    expect(opened["ambient:Tavern"]).toBe(true);
    expect(togglePlaylistExpansion(opened, "ambient", "Tavern")["ambient:Tavern"]).toBe(false);
  });

  it("uses track title as the compact visible label", () => {
    expect(displayAudioTrackTitle(track(".music/ambient/Tavern/crowd.mp3", "ambient"))).toBe(
      "crowd"
    );
  });

  it("builds a playlist queue for a bus and playlist in stable track order", () => {
    const first = track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern");
    const second = track(".music/ambient/Tavern/laughter.mp3", "ambient", "Tavern");
    const state = loadAudioPlaylist(createAudioMixerState(), "ambient", "Tavern", [
      first,
      track(".music/music/Tavern/song.mp3", "music", "Tavern"),
      second,
      track(".music/ambient/Rain/rain.mp3", "ambient", "Rain")
    ]);

    expect(state.ambient.playlistMode).toBe(true);
    expect(state.ambient.playlist).toBe("Tavern");
    expect(state.ambient.playlistTracks).toEqual([first, second]);
    expect(state.ambient.playlistIndex).toBe(0);
    expect(state.ambient.track).toBe(first);
    expect(state.ambient.playing).toBe(false);
    expect(audioQueueLabel(state.ambient)).toBe("Tavern 1/2");
  });

  it("keeps queues independent per bus", () => {
    let state = createAudioMixerState();
    state = loadAudioPlaylist(state, "ambient", "Tavern", [
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern"),
      track(".music/ambient/Tavern/laughter.mp3", "ambient", "Tavern")
    ]);
    state = loadAudioPlaylist(state, "music", "Bard", [
      track(".music/music/Bard/verse.ogg", "music", "Bard"),
      track(".music/music/Bard/chorus.ogg", "music", "Bard")
    ]);
    state = advanceAudioQueue(state, "ambient");

    expect(state.ambient.track?.name).toBe("laughter.mp3");
    expect(state.music.track?.name).toBe("verse.ogg");
    expect(state.music.playlistIndex).toBe(0);
  });

  it("advances and rewinds queues without playlist looping", () => {
    let state = loadAudioPlaylist(createAudioMixerState(), "ambient", "Tavern", [
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern"),
      track(".music/ambient/Tavern/laughter.mp3", "ambient", "Tavern")
    ]);

    state = advanceAudioQueue(state, "ambient");
    expect(state.ambient.track?.name).toBe("laughter.mp3");

    state = advanceAudioQueue(state, "ambient");
    expect(state.ambient.track?.name).toBe("laughter.mp3");
    expect(state.ambient.playing).toBe(false);

    state = rewindAudioQueue(state, "ambient");
    expect(state.ambient.track?.name).toBe("crowd.mp3");

    state = rewindAudioQueue(state, "ambient");
    expect(state.ambient.track?.name).toBe("crowd.mp3");
  });

  it("advances and rewinds queues with playlist looping", () => {
    let state = loadAudioPlaylist(createAudioMixerState(), "ambient", "Tavern", [
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern"),
      track(".music/ambient/Tavern/laughter.mp3", "ambient", "Tavern")
    ]);
    state = setAudioPlaylistLoop(state, "ambient", true);

    state = rewindAudioQueue(state, "ambient");
    expect(state.ambient.track?.name).toBe("laughter.mp3");

    state = advanceAudioQueue(state, "ambient");
    expect(state.ambient.track?.name).toBe("crowd.mp3");
  });

  it("clears a playlist queue when loading a single track", () => {
    let state = loadAudioPlaylist(createAudioMixerState(), "ambient", "Tavern", [
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern"),
      track(".music/ambient/Tavern/laughter.mp3", "ambient", "Tavern")
    ]);

    state = loadAudioTrack(state, track(".music/ambient/Rain/rain.mp3", "ambient", "Rain"));

    expect(state.ambient.track?.name).toBe("rain.mp3");
    expect(state.ambient.playlistMode).toBe(false);
    expect(state.ambient.playlistTracks).toEqual([]);
    expect(state.ambient.playlistIndex).toBe(-1);
    expect(audioQueueLabel(state.ambient)).toBe("rain");
  });

  it("clears queues and fades when stopping one bus or all buses", () => {
    let state = loadAudioPlaylist(createAudioMixerState(), "ambient", "Tavern", [
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern")
    ]);
    state = loadAudioPlaylist(state, "music", "Bard", [
      track(".music/music/Bard/verse.ogg", "music", "Bard")
    ]);
    state = startAudioFade(state, "ambient", "fading_out", 800, 10);
    state = startAudioFade(state, "music", "fading_in", 800, 10);

    const stoppedAmbient = stopAudioBus(state, "ambient");
    expect(stoppedAmbient.ambient.playlistMode).toBe(false);
    expect(stoppedAmbient.ambient.playlistTracks).toEqual([]);
    expect(stoppedAmbient.ambient.fadeStatus).toBe("idle");
    expect(stoppedAmbient.music.playlistMode).toBe(true);

    const stoppedAll = stopAllAudio(state);
    expect(stoppedAll.ambient.playlistMode).toBe(false);
    expect(stoppedAll.music.playlistMode).toBe(false);
    expect(stoppedAll.ambient.fadeStatus).toBe("idle");
    expect(stoppedAll.music.fadeStatus).toBe("idle");
  });

  it("keeps snapshot-style single-track restore possible through loadAudioTrack", () => {
    const saved = track(".music/music/bard.ogg", "music", "Bard");
    const state = loadAudioTrack(createAudioMixerState(), saved);

    expect(state.music.track).toBe(saved);
    expect(state.music.playlistMode).toBe(false);
    expect(state.music.playlist).toBeNull();
    expect(state.music.playlistTracks).toEqual([]);
  });

  it("clamps fade duration and reports deterministic fade out progress and factor", () => {
    let state = loadAudioTrack(
      createAudioMixerState(),
      track(".music/ambient/Tavern/crowd.mp3", "ambient", "Tavern")
    );
    state = startAudioFade(state, "ambient", "fading_out", -20, 100);
    expect(state.ambient.fadeDurationMs).toBe(0);
    expect(audioFadeProgress(state.ambient, 100)).toEqual({ progress: 1, factor: 0 });

    state = startAudioFade(state, "ambient", "fading_out", 500, 100);
    expect(audioFadeProgress(state.ambient, 100)).toEqual({ progress: 0, factor: 1 });
    expect(audioFadeProgress(state.ambient, 350)).toEqual({ progress: 0.5, factor: 0.5 });
    expect(audioFadeProgress(state.ambient, 700)).toEqual({ progress: 1, factor: 0 });

    state = cancelAudioFade(state, "ambient");
    expect(state.ambient.fadeStatus).toBe("idle");
    expect(audioFadeProgress(state.ambient, 350)).toEqual({ progress: 1, factor: 1 });

    state = finishAudioFade(startAudioFade(state, "ambient", "fading_out", 500, 100), "ambient");
    expect(state.ambient.fadeStatus).toBe("idle");
    expect(state.ambient.fadeDurationMs).toBe(0);
    expect(state.ambient.playing).toBe(false);
  });

  it("starts playback for fade in and reports fade in factor", () => {
    let state = loadAudioTrack(
      createAudioMixerState(),
      track(".music/music/Bard/song.ogg", "music", "Bard")
    );
    state = startAudioFade(state, "music", "fading_in", 500, 100);

    expect(state.music.playing).toBe(true);
    expect(audioFadeProgress(state.music, 100)).toEqual({ progress: 0, factor: 0 });
    expect(audioFadeProgress(state.music, 350)).toEqual({ progress: 0.5, factor: 0.5 });
    expect(audioFadeProgress(state.music, 700)).toEqual({ progress: 1, factor: 1 });

    state = finishAudioFade(state, "music");
    expect(state.music.playing).toBe(true);
  });
});
