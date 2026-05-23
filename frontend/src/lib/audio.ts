import type { AudioBus, AudioPlaylist, AudioTrack } from "./api";
import type { Translator } from "../lang";

export const AUDIO_BUSES: AudioBus[] = ["ambient", "music", "effect"];

export type AudioBusState = {
  track: AudioTrack | null;
  playing: boolean;
  loop: boolean;
  volume: number;
  playlistMode: boolean;
  playlist: string | null;
  playlistTracks: AudioTrack[];
  playlistIndex: number;
  playlistLoop: boolean;
  fadeStatus: "idle" | "fading_in" | "fading_out";
  fadeDurationMs: number;
  fadeStartedAtMs: number;
};

export type AudioMixerState = Record<AudioBus, AudioBusState>;

export type AudioTrackGroup = {
  bus: AudioBus;
  playlist: string | null;
  tracks: AudioTrack[];
};

export type AudioTrackGroupsByBus = Record<AudioBus, AudioTrackGroup[]>;
export type PlaylistExpansionState = Record<string, boolean>;

export type ResolvedAudioPlaylist = AudioPlaylist & {
  tracks: AudioTrack[];
  missing_paths: string[];
};

function clampVolume(volume: number): number {
  if (Number.isNaN(volume)) {
    return 0;
  }
  return Math.min(Math.max(volume, 0), 1);
}

function clampFadeDuration(durationMs: number): number {
  if (Number.isNaN(durationMs)) {
    return 0;
  }
  return Math.max(0, Math.floor(durationMs));
}

function audioPlaylistTimestamp(now?: string): string {
  return now ?? new Date().toISOString();
}

function audioPlaylistName(name: string): string {
  return name.trim() || "Untitled playlist";
}

function audioPlaylistIdBase(name: string): string {
  return (
    audioPlaylistName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "playlist"
  );
}

function createAudioPlaylistId(playlists: AudioPlaylist[], name: string): string {
  const existingIds = new Set(playlists.map((playlist) => playlist.id));
  const baseId = audioPlaylistIdBase(name);
  let id = baseId;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function updateAudioPlaylist(
  playlists: AudioPlaylist[],
  playlistId: string,
  updater: (playlist: AudioPlaylist) => AudioPlaylist
): AudioPlaylist[] {
  return playlists.map((playlist) =>
    playlist.id === playlistId ? updater(playlist) : playlist
  );
}

function createAudioBusState(loop: boolean, volume: number): AudioBusState {
  return {
    track: null,
    playing: false,
    loop,
    volume,
    playlistMode: false,
    playlist: null,
    playlistTracks: [],
    playlistIndex: -1,
    playlistLoop: false,
    fadeStatus: "idle",
    fadeDurationMs: 0,
    fadeStartedAtMs: 0
  };
}

function clearAudioQueue(busState: AudioBusState): AudioBusState {
  return {
    ...busState,
    playlistMode: false,
    playlist: null,
    playlistTracks: [],
    playlistIndex: -1
  };
}

function clearAudioFade(busState: AudioBusState): AudioBusState {
  return {
    ...busState,
    fadeStatus: "idle",
    fadeDurationMs: 0,
    fadeStartedAtMs: 0
  };
}

export function createAudioMixerState(): AudioMixerState {
  return {
    ambient: createAudioBusState(true, 0.7),
    music: createAudioBusState(true, 0.7),
    effect: createAudioBusState(false, 0.85)
  };
}

export function createAudioPlaylist(
  playlists: AudioPlaylist[],
  name: string,
  bus: AudioBus,
  now?: string
): AudioPlaylist[] {
  const timestamp = audioPlaylistTimestamp(now);
  return [
    ...playlists,
    {
      id: createAudioPlaylistId(playlists, name),
      name: audioPlaylistName(name),
      bus,
      track_paths: [],
      loop: false,
      created_at: timestamp,
      updated_at: timestamp
    }
  ];
}

export function renameAudioPlaylist(
  playlists: AudioPlaylist[],
  playlistId: string,
  name: string,
  now?: string
): AudioPlaylist[] {
  const playlistName = audioPlaylistName(name);
  const updatedAt = audioPlaylistTimestamp(now);
  return updateAudioPlaylist(playlists, playlistId, (playlist) => ({
    ...playlist,
    name: playlistName,
    updated_at: updatedAt
  }));
}

export function deleteAudioPlaylist(
  playlists: AudioPlaylist[],
  playlistId: string
): AudioPlaylist[] {
  return playlists.filter((playlist) => playlist.id !== playlistId);
}

export function setSavedAudioPlaylistBus(
  playlists: AudioPlaylist[],
  playlistId: string,
  bus: AudioBus,
  now?: string
): AudioPlaylist[] {
  const updatedAt = audioPlaylistTimestamp(now);
  return updateAudioPlaylist(playlists, playlistId, (playlist) => ({
    ...playlist,
    bus,
    updated_at: updatedAt
  }));
}

export function setSavedAudioPlaylistLoop(
  playlists: AudioPlaylist[],
  playlistId: string,
  loop: boolean,
  now?: string
): AudioPlaylist[] {
  const updatedAt = audioPlaylistTimestamp(now);
  return updateAudioPlaylist(playlists, playlistId, (playlist) => ({
    ...playlist,
    loop,
    updated_at: updatedAt
  }));
}

export function addAudioPlaylistTrack(
  playlists: AudioPlaylist[],
  playlistId: string,
  path: string,
  now?: string
): AudioPlaylist[] {
  const updatedAt = audioPlaylistTimestamp(now);
  return updateAudioPlaylist(playlists, playlistId, (playlist) => {
    if (playlist.track_paths.includes(path)) {
      return playlist;
    }
    return {
      ...playlist,
      track_paths: [...playlist.track_paths, path],
      updated_at: updatedAt
    };
  });
}

export function removeAudioPlaylistTrack(
  playlists: AudioPlaylist[],
  playlistId: string,
  path: string,
  now?: string
): AudioPlaylist[] {
  const updatedAt = audioPlaylistTimestamp(now);
  return updateAudioPlaylist(playlists, playlistId, (playlist) => ({
    ...playlist,
    track_paths: playlist.track_paths.filter((trackPath) => trackPath !== path),
    updated_at: updatedAt
  }));
}

export function reorderAudioPlaylistTracks(
  playlists: AudioPlaylist[],
  playlistId: string,
  trackPaths: string[],
  now?: string
): AudioPlaylist[] {
  const updatedAt = audioPlaylistTimestamp(now);
  return updateAudioPlaylist(playlists, playlistId, (playlist) => {
    const existingPaths = new Set(playlist.track_paths);
    return {
      ...playlist,
      track_paths: trackPaths.filter((trackPath) => existingPaths.has(trackPath)),
      updated_at: updatedAt
    };
  });
}

export function moveAudioPlaylistTrack(
  playlists: AudioPlaylist[],
  playlistId: string,
  index: number,
  direction: -1 | 1,
  now?: string
): AudioPlaylist[] {
  return updateAudioPlaylist(playlists, playlistId, (playlist) => {
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || index >= playlist.track_paths.length || nextIndex >= playlist.track_paths.length) {
      return playlist;
    }
    const trackPaths = [...playlist.track_paths];
    const [moved] = trackPaths.splice(index, 1);
    trackPaths.splice(nextIndex, 0, moved);
    return {
      ...playlist,
      track_paths: trackPaths,
      updated_at: audioPlaylistTimestamp(now)
    };
  });
}

export function resolveAudioPlaylist(
  playlist: AudioPlaylist,
  tracks: AudioTrack[]
): ResolvedAudioPlaylist {
  const tracksByPath = new Map(tracks.map((track) => [track.path, track]));
  const playableTracks: AudioTrack[] = [];
  const missingPaths: string[] = [];

  for (const path of playlist.track_paths) {
    const track = tracksByPath.get(path);
    if (track) {
      playableTracks.push(track);
    } else {
      missingPaths.push(path);
    }
  }

  return {
    ...playlist,
    tracks: playableTracks,
    missing_paths: missingPaths
  };
}

export function resolveAudioPlaylists(
  playlists: AudioPlaylist[],
  tracks: AudioTrack[]
): ResolvedAudioPlaylist[] {
  return playlists.map((playlist) => resolveAudioPlaylist(playlist, tracks));
}

export function loadAudioTrack(state: AudioMixerState, track: AudioTrack): AudioMixerState {
  return {
    ...state,
    [track.bus]: {
      ...clearAudioFade(clearAudioQueue(state[track.bus])),
      track,
      playing: false
    }
  };
}

export function loadAudioPlaylist(
  state: AudioMixerState,
  bus: AudioBus,
  playlist: string | null,
  tracks: AudioTrack[]
): AudioMixerState {
  const playlistTracks = tracks.filter(
    (track) => track.bus === bus && track.playlist === playlist
  );
  return {
    ...state,
    [bus]: {
      ...clearAudioFade(state[bus]),
      track: playlistTracks[0] ?? null,
      playing: false,
      playlistMode: playlistTracks.length > 0,
      playlist,
      playlistTracks,
      playlistIndex: playlistTracks.length > 0 ? 0 : -1
    }
  };
}

export function loadSavedAudioPlaylist(
  state: AudioMixerState,
  playlist: AudioPlaylist,
  tracks: AudioTrack[]
): AudioMixerState {
  const playlistTracks = resolveAudioPlaylist(playlist, tracks).tracks;
  return {
    ...state,
    [playlist.bus]: {
      ...clearAudioFade(state[playlist.bus]),
      track: playlistTracks[0] ?? null,
      playing: false,
      playlistMode: playlistTracks.length > 0,
      playlist: playlist.name,
      playlistTracks,
      playlistIndex: playlistTracks.length > 0 ? 0 : -1,
      playlistLoop: playlist.loop
    }
  };
}

export function setAudioBusPlaying(
  state: AudioMixerState,
  bus: AudioBus,
  playing: boolean
): AudioMixerState {
  return {
    ...state,
    [bus]: {
      ...state[bus],
      playing: Boolean(state[bus].track && playing)
    }
  };
}

export function stopAudioBus(state: AudioMixerState, bus: AudioBus): AudioMixerState {
  return {
    ...state,
    [bus]: {
      ...clearAudioFade(clearAudioQueue(state[bus])),
      track: null,
      playing: false
    }
  };
}

export function stopAllAudio(state: AudioMixerState): AudioMixerState {
  return AUDIO_BUSES.reduce(
    (nextState, bus) => stopAudioBus(nextState, bus),
    state
  );
}

export function setAudioBusLoop(
  state: AudioMixerState,
  bus: AudioBus,
  loop: boolean
): AudioMixerState {
  return {
    ...state,
    [bus]: {
      ...state[bus],
      loop
    }
  };
}

export function setAudioBusVolume(
  state: AudioMixerState,
  bus: AudioBus,
  volume: number
): AudioMixerState {
  return {
    ...state,
    [bus]: {
      ...state[bus],
      volume: clampVolume(volume)
    }
  };
}

export function setAudioPlaylistLoop(
  state: AudioMixerState,
  bus: AudioBus,
  playlistLoop: boolean
): AudioMixerState {
  return {
    ...state,
    [bus]: {
      ...state[bus],
      playlistLoop
    }
  };
}

export function advanceAudioQueue(state: AudioMixerState, bus: AudioBus): AudioMixerState {
  const busState = state[bus];
  if (!busState.playlistMode || busState.playlistTracks.length === 0) {
    return state;
  }
  const nextIndex = busState.playlistIndex + 1;
  if (nextIndex >= busState.playlistTracks.length) {
    if (!busState.playlistLoop) {
      return {
        ...state,
        [bus]: {
          ...busState,
          playing: false
        }
      };
    }
    return {
      ...state,
      [bus]: {
        ...busState,
        track: busState.playlistTracks[0],
        playlistIndex: 0
      }
    };
  }
  return {
    ...state,
    [bus]: {
      ...busState,
      track: busState.playlistTracks[nextIndex],
      playlistIndex: nextIndex
    }
  };
}

export function rewindAudioQueue(state: AudioMixerState, bus: AudioBus): AudioMixerState {
  const busState = state[bus];
  if (!busState.playlistMode || busState.playlistTracks.length === 0) {
    return state;
  }
  const nextIndex = busState.playlistIndex - 1;
  if (nextIndex < 0) {
    if (!busState.playlistLoop) {
      return state;
    }
    const playlistIndex = busState.playlistTracks.length - 1;
    return {
      ...state,
      [bus]: {
        ...busState,
        track: busState.playlistTracks[playlistIndex],
        playlistIndex
      }
    };
  }
  return {
    ...state,
    [bus]: {
      ...busState,
      track: busState.playlistTracks[nextIndex],
      playlistIndex: nextIndex
    }
  };
}

export function startAudioFade(
  state: AudioMixerState,
  bus: AudioBus,
  direction: "fading_in" | "fading_out",
  durationMs: number,
  startedAtMs = 0
): AudioMixerState {
  const busState = state[bus];
  if (!busState.track) {
    return state;
  }
  return {
    ...state,
    [bus]: {
      ...busState,
      playing: direction === "fading_in" ? true : busState.playing,
      fadeStatus: direction,
      fadeDurationMs: clampFadeDuration(durationMs),
      fadeStartedAtMs: startedAtMs
    }
  };
}

export function finishAudioFade(state: AudioMixerState, bus: AudioBus): AudioMixerState {
  const busState = state[bus];
  return {
    ...state,
    [bus]: {
      ...clearAudioFade(busState),
      playing: busState.fadeStatus === "fading_out" ? false : busState.playing
    }
  };
}

export function cancelAudioFade(state: AudioMixerState, bus: AudioBus): AudioMixerState {
  return finishAudioFade(state, bus);
}

export function audioFadeProgress(
  busState: AudioBusState,
  nowMs: number
): { progress: number; factor: number } {
  if (busState.fadeStatus === "idle") {
    return { progress: 1, factor: 1 };
  }
  if (busState.fadeDurationMs <= 0) {
    return {
      progress: 1,
      factor: busState.fadeStatus === "fading_in" ? 1 : 0
    };
  }
  const elapsedMs = Math.max(0, nowMs - busState.fadeStartedAtMs);
  const progress = Math.min(elapsedMs / busState.fadeDurationMs, 1);
  return {
    progress,
    factor: busState.fadeStatus === "fading_in" ? progress : 1 - progress
  };
}

export function groupAudioTracks(tracks: AudioTrack[]): AudioTrackGroup[] {
  const groups = new Map<string, AudioTrackGroup>();
  for (const track of tracks) {
    const key = `${track.bus}:${track.playlist ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.tracks.push(track);
      continue;
    }
    groups.set(key, { bus: track.bus, playlist: track.playlist, tracks: [track] });
  }
  return Array.from(groups.values()).sort((first, second) => {
    const busDelta = AUDIO_BUSES.indexOf(first.bus) - AUDIO_BUSES.indexOf(second.bus);
    if (busDelta !== 0) {
      return busDelta;
    }
    return (first.playlist ?? "").localeCompare(second.playlist ?? "");
  });
}

export function groupAudioTracksByBus(tracks: AudioTrack[]): AudioTrackGroupsByBus {
  const allGroups = groupAudioTracks(tracks);
  return {
    ambient: allGroups.filter((group) => group.bus === "ambient"),
    music: allGroups.filter((group) => group.bus === "music"),
    effect: allGroups.filter((group) => group.bus === "effect")
  };
}

export function playlistExpansionKey(bus: AudioBus, playlist: string | null): string {
  return `${bus}:${playlist ?? ""}`;
}

export function createPlaylistExpansionState(
  groupsByBus: AudioTrackGroupsByBus,
  query: string,
  previous: PlaylistExpansionState = {}
): PlaylistExpansionState {
  const hasQuery = query.trim().length > 0;
  const nextState: PlaylistExpansionState = {};
  for (const bus of AUDIO_BUSES) {
    for (const group of groupsByBus[bus]) {
      const key = playlistExpansionKey(bus, group.playlist);
      nextState[key] = previous[key] ?? hasQuery;
    }
  }
  return nextState;
}

export function togglePlaylistExpansion(
  state: PlaylistExpansionState,
  bus: AudioBus,
  playlist: string | null
): PlaylistExpansionState {
  const key = playlistExpansionKey(bus, playlist);
  return { ...state, [key]: !(state[key] ?? true) };
}

export function displayAudioTrackTitle(track: AudioTrack): string {
  return track.title || track.name.replace(/\.[^.]+$/, "");
}

export function audioQueueLabel(busState: AudioBusState): string {
  if (busState.playlistMode && busState.playlistTracks.length > 0) {
    return `${busState.playlist ?? "Playlist"} ${busState.playlistIndex + 1}/${
      busState.playlistTracks.length
    }`;
  }
  return busState.track ? displayAudioTrackTitle(busState.track) : "Quiet";
}

export function audioSummary(state: AudioMixerState, t?: Translator): string {
  const active = AUDIO_BUSES.filter((bus) => state[bus].track);
  if (active.length === 0) {
    return t?.("audio.summary.quiet") ?? "Quiet";
  }
  const playing = active.filter((bus) => state[bus].playing);
  if (playing.length === 0) {
    return t?.("audio.summary.loaded", { count: active.length }) ?? `${active.length} loaded`;
  }
  return t?.("audio.summary.playing", { count: playing.length }) ?? `${playing.length} playing`;
}

export function busLabel(bus: AudioBus): string {
  return bus === "effect" ? "Effect" : bus[0].toUpperCase() + bus.slice(1);
}

export function hasLoadedAudio(state: AudioMixerState): boolean {
  return AUDIO_BUSES.some((bus) => Boolean(state[bus].track));
}
