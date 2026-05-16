import type {
  DisplayState,
  TableSnapshotAudioState,
  TableSnapshotDetail,
  TableSnapshotState,
  TableSnapshotSummary,
  WorkspaceState
} from "./api";
import {
  AUDIO_BUSES,
  type AudioMixerState,
  setAudioBusLoop,
  setAudioBusPlaying,
  setAudioBusVolume,
  stopAudioBus,
  loadAudioTrack
} from "./audio";
import type { MapState } from "./map";

export function sortTableSnapshots<T extends TableSnapshotSummary>(snapshots: T[]): T[] {
  return [...snapshots].sort((first, second) => {
    const updatedDelta =
      new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime();
    if (updatedDelta !== 0) {
      return updatedDelta;
    }
    return first.name.localeCompare(second.name);
  });
}

export function captureAudioSnapshot(state: AudioMixerState): TableSnapshotAudioState {
  return {
    ambient: {
      track: state.ambient.track,
      playing: Boolean(state.ambient.track && state.ambient.playing),
      loop: state.ambient.loop,
      volume: state.ambient.volume
    },
    music: {
      track: state.music.track,
      playing: Boolean(state.music.track && state.music.playing),
      loop: state.music.loop,
      volume: state.music.volume
    },
    effect: {
      track: state.effect.track,
      playing: Boolean(state.effect.track && state.effect.playing),
      loop: state.effect.loop,
      volume: state.effect.volume
    }
  };
}

export function applyAudioSnapshot(
  state: AudioMixerState,
  snapshot: TableSnapshotAudioState
): AudioMixerState {
  let nextState = state;
  for (const bus of AUDIO_BUSES) {
    const busSnapshot = snapshot[bus];
    nextState = busSnapshot.track
      ? loadAudioTrack(nextState, busSnapshot.track)
      : stopAudioBus(nextState, bus);
    nextState = setAudioBusLoop(nextState, bus, busSnapshot.loop);
    nextState = setAudioBusVolume(nextState, bus, busSnapshot.volume);
    nextState = setAudioBusPlaying(
      nextState,
      bus,
      Boolean(busSnapshot.track && busSnapshot.playing)
    );
  }
  return nextState;
}

export function buildTableSnapshotState(
  display: DisplayState,
  map: MapState,
  workspace: WorkspaceState,
  audioMixer: AudioMixerState
): TableSnapshotState {
  return {
    display,
    map,
    workspace: {
      workspace_id: workspace.workspaceId,
      workspace_name: workspace.workspaceName,
      tabs: workspace.tabs,
      activePath: workspace.activePath,
      layout: workspace.layout
    },
    audio: captureAudioSnapshot(audioMixer)
  };
}

export function saveTableSnapshotInList<T extends TableSnapshotSummary>(
  snapshots: T[],
  savedSnapshot: T
): T[] {
  return sortTableSnapshots([
    savedSnapshot,
    ...snapshots.filter((snapshot) => snapshot.id !== savedSnapshot.id)
  ]);
}

export function loadTableSnapshotState(snapshot: TableSnapshotDetail): TableSnapshotState {
  return snapshot.state;
}

export function deleteTableSnapshotFromList<T extends TableSnapshotSummary>(
  snapshots: T[],
  snapshotId: string
): T[] {
  return snapshots.filter((snapshot) => snapshot.id !== snapshotId);
}
