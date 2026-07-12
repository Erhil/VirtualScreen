import { useEffect, useRef, useState } from "react";

import {
  addAudioPlaylistTrack,
  advanceAudioQueue,
  createAudioMixerState,
  createAudioPlaylist,
  createPlaylistExpansionState,
  deleteAudioPlaylist,
  finishAudioFade,
  groupAudioTracksByBus,
  loadAudioPlaylist,
  loadAudioTrack,
  loadSavedAudioPlaylist,
  moveAudioPlaylistTrack,
  removeAudioPlaylistTrack,
  renameAudioPlaylist,
  rewindAudioQueue,
  setAudioBusLoop,
  setAudioBusPlaying,
  setAudioBusVolume,
  setAudioPlaylistLoop,
  setSavedAudioPlaylistBus,
  setSavedAudioPlaylistLoop,
  startAudioFade,
  stopAllAudio,
  stopAudioBus,
  togglePlaylistExpansion,
  type AudioLoadState,
  type AudioMixerState,
  type AudioPlaylistLoadState,
  type PlaylistExpansionState
} from "../lib/audio";
import {
  fetchAudioLibrary,
  fetchAudioPlaylists,
  saveAudioPlaylists,
  type AudioBus,
  type AudioPlaylist,
  type AudioTrack
} from "../lib/api";
import type { Translator } from "../lang";

const AUDIO_FADE_DURATION_MS = 2000;

export type UseAudioOptions = {
  worldId: string | undefined;
  workspaceReady: boolean;
  audioToolOpen: boolean;
  t: Translator;
};

export function useAudio(options: UseAudioOptions) {
  const { worldId, workspaceReady, audioToolOpen, t } = options;

  const [audioQuery, setAudioQuery] = useState("");
  const [audioState, setAudioState] = useState<AudioLoadState>({ status: "idle" });
  const [audioAutocompleteTracks, setAudioAutocompleteTracks] = useState<AudioTrack[]>([]);
  const [audioMixer, setAudioMixer] = useState<AudioMixerState>(() => createAudioMixerState());
  const [audioPlaylistState, setAudioPlaylistState] = useState<AudioPlaylistLoadState>({
    status: "idle",
    playlists: []
  });
  const [audioPlaylistExpansion, setAudioPlaylistExpansion] =
    useState<PlaylistExpansionState>({});

  const audioPlaylistsRef = useRef<AudioPlaylist[]>([]);
  const audioPlaylistSaveRevisionRef = useRef(0);

  async function fetchFullAudioLibraryTracks(): Promise<AudioTrack[]> {
    if (audioAutocompleteTracks.length > 0) {
      return audioAutocompleteTracks;
    }
    const tracks = await fetchAudioLibrary();
    setAudioAutocompleteTracks(tracks);
    return tracks;
  }

  useEffect(() => {
    if (!audioToolOpen) {
      return;
    }

    let cancelled = false;
    setAudioState({ status: "loading" });
    const timeout = window.setTimeout(() => {
      fetchAudioLibrary({ q: audioQuery.trim() || undefined })
        .then((tracks) => {
          if (!cancelled) {
            setAudioState({ status: "ready", tracks });
            setAudioPlaylistExpansion((current) =>
              createPlaylistExpansionState(
                groupAudioTracksByBus(tracks),
                audioQuery.trim(),
                current
              )
            );
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            const message = error instanceof Error ? error.message : "Unknown error";
            setAudioState({ status: "error", message });
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [audioToolOpen, audioQuery, worldId]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    let cancelled = false;
    setAudioPlaylistState({ status: "loading", playlists: [] });
    fetchAudioPlaylists()
      .then((response) => {
        if (!cancelled) {
          audioPlaylistsRef.current = response.playlists;
          setAudioPlaylistState({
            status: "ready",
            playlists: response.playlists
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error";
          audioPlaylistsRef.current = [];
          setAudioPlaylistState({ status: "error", playlists: [], message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceReady, worldId]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }

    let cancelled = false;
    fetchAudioLibrary()
      .then((tracks) => {
        if (!cancelled) {
          setAudioAutocompleteTracks(tracks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAudioAutocompleteTracks([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceReady, worldId]);

  function persistAudioPlaylists(playlists: AudioPlaylist[]) {
    const revision = audioPlaylistSaveRevisionRef.current + 1;
    audioPlaylistSaveRevisionRef.current = revision;
    audioPlaylistsRef.current = playlists;
    setAudioPlaylistState({
      status: "saving",
      playlists,
      message: t("audio.savedSaving")
    });
    void saveAudioPlaylists(playlists)
      .then((response) => {
        if (audioPlaylistSaveRevisionRef.current !== revision) {
          return;
        }
        audioPlaylistsRef.current = response.playlists;
        setAudioPlaylistState({
          status: "ready",
          playlists: response.playlists,
          message: t("audio.savedSaved")
        });
      })
      .catch((error: unknown) => {
        if (audioPlaylistSaveRevisionRef.current !== revision) {
          return;
        }
        const message = error instanceof Error ? error.message : t("audio.savedSaveError");
        setAudioPlaylistState({ status: "error", playlists, message });
      });
  }

  function updateAudioPlaylists(updater: (playlists: AudioPlaylist[]) => AudioPlaylist[]) {
    persistAudioPlaylists(updater(audioPlaylistsRef.current));
  }

  function handleSavedAudioPlaylistCreate(name: string, bus: AudioBus) {
    updateAudioPlaylists((playlists) => createAudioPlaylist(playlists, name, bus));
  }

  function handleSavedAudioPlaylistRename(playlistId: string, name: string) {
    updateAudioPlaylists((playlists) => renameAudioPlaylist(playlists, playlistId, name));
  }

  function handleSavedAudioPlaylistDelete(playlistId: string) {
    updateAudioPlaylists((playlists) => deleteAudioPlaylist(playlists, playlistId));
  }

  function handleSavedAudioPlaylistBusChange(playlistId: string, bus: AudioBus) {
    updateAudioPlaylists((playlists) => setSavedAudioPlaylistBus(playlists, playlistId, bus));
  }

  function handleSavedAudioPlaylistLoopChange(playlistId: string, loop: boolean) {
    updateAudioPlaylists((playlists) => setSavedAudioPlaylistLoop(playlists, playlistId, loop));
  }

  function handleSavedAudioPlaylistAddTrack(playlistId: string, path: string) {
    updateAudioPlaylists((playlists) => addAudioPlaylistTrack(playlists, playlistId, path.trim()));
  }

  function handleSavedAudioPlaylistAddCurrentTrack(playlistId: string) {
    const playlist = audioPlaylistsRef.current.find((candidate) => candidate.id === playlistId);
    const currentTrack = playlist ? audioMixer[playlist.bus].track : null;
    if (!currentTrack) {
      setAudioPlaylistState({
        status: "error",
        playlists: audioPlaylistsRef.current,
        message: t("audio.noCurrentTrack")
      });
      return;
    }
    handleSavedAudioPlaylistAddTrack(playlistId, currentTrack.path);
  }

  function handleSavedAudioPlaylistRemoveTrack(playlistId: string, path: string) {
    updateAudioPlaylists((playlists) => removeAudioPlaylistTrack(playlists, playlistId, path));
  }

  function handleSavedAudioPlaylistMoveTrack(
    playlistId: string,
    index: number,
    direction: -1 | 1
  ) {
    updateAudioPlaylists((playlists) =>
      moveAudioPlaylistTrack(playlists, playlistId, index, direction)
    );
  }

  async function handleSavedAudioPlaylistPlay(playlistId: string) {
    const playlist = audioPlaylistsRef.current.find((candidate) => candidate.id === playlistId);
    if (!playlist) {
      return;
    }
    try {
      const tracks =
        audioAutocompleteTracks.length > 0
          ? audioAutocompleteTracks
          : await fetchAudioLibrary();
      if (audioAutocompleteTracks.length === 0) {
        setAudioAutocompleteTracks(tracks);
      }
      const nextMixer = loadSavedAudioPlaylist(audioMixer, playlist, tracks);
      if (!nextMixer[playlist.bus].track) {
        setAudioPlaylistState({
          status: "error",
          playlists: audioPlaylistsRef.current,
          message: t("audio.noPlayableTracks")
        });
        return;
      }
      setAudioMixer(setAudioBusPlaying(nextMixer, playlist.bus, true));
      setAudioPlaylistState({
        status: "ready",
        playlists: audioPlaylistsRef.current,
        message: t("audio.savedLoaded", { name: playlist.name })
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("audio.savedLoadError");
      setAudioPlaylistState({ status: "error", playlists: audioPlaylistsRef.current, message });
    }
  }

  function handleAudioLoadTrack(track: AudioTrack) {
    setAudioMixer((state) => loadAudioTrack(state, track));
  }

  function handleAudioLoadPlaylist(
    bus: AudioBus,
    playlist: string | null,
    tracks: AudioTrack[]
  ) {
    setAudioMixer((state) =>
      setAudioBusPlaying(loadAudioPlaylist(state, bus, playlist, tracks), bus, true)
    );
  }

  function handleAudioPlayingChange(bus: AudioBus, playing: boolean) {
    setAudioMixer((state) => setAudioBusPlaying(state, bus, playing));
  }

  function handleAudioEnded(bus: AudioBus) {
    setAudioMixer((state) => {
      if (state[bus].playlistMode) {
        return advanceAudioQueue(state, bus);
      }
      return setAudioBusPlaying(state, bus, false);
    });
  }

  function handleAudioStopBus(bus: AudioBus) {
    setAudioMixer((state) => stopAudioBus(state, bus));
  }

  function handleAudioStopAll() {
    setAudioMixer((state) => stopAllAudio(state));
  }

  function handleAudioLoopChange(bus: AudioBus, loop: boolean) {
    setAudioMixer((state) => setAudioBusLoop(state, bus, loop));
  }

  function handleAudioPlaylistLoopChange(bus: AudioBus, loop: boolean) {
    setAudioMixer((state) => setAudioPlaylistLoop(state, bus, loop));
  }

  function handleAudioNextTrack(bus: AudioBus) {
    setAudioMixer((state) => advanceAudioQueue(state, bus));
  }

  function handleAudioPreviousTrack(bus: AudioBus) {
    setAudioMixer((state) => rewindAudioQueue(state, bus));
  }

  function handleAudioFadeIn(bus: AudioBus) {
    setAudioMixer((state) =>
      startAudioFade(state, bus, "fading_in", AUDIO_FADE_DURATION_MS, performance.now())
    );
  }

  function handleAudioFadeOut(bus: AudioBus) {
    setAudioMixer((state) =>
      startAudioFade(state, bus, "fading_out", AUDIO_FADE_DURATION_MS, performance.now())
    );
  }

  function handleAudioFadeFinish(bus: AudioBus) {
    setAudioMixer((state) => finishAudioFade(state, bus));
  }

  function handleAudioVolumeChange(bus: AudioBus, volume: number) {
    setAudioMixer((state) => setAudioBusVolume(state, bus, volume));
  }

  function handleAudioPlaylistToggle(bus: AudioBus, playlist: string | null) {
    setAudioPlaylistExpansion((state) => togglePlaylistExpansion(state, bus, playlist));
  }

  function reset() {
    setAudioQuery("");
    setAudioState({ status: "idle" });
    setAudioAutocompleteTracks([]);
    audioPlaylistsRef.current = [];
    setAudioPlaylistState({ status: "idle", playlists: [] });
    setAudioMixer(createAudioMixerState());
    setAudioPlaylistExpansion({});
  }

  return {
    audioQuery,
    audioState,
    audioAutocompleteTracks,
    audioMixer,
    audioPlaylistState,
    audioPlaylistExpansion,
    setAudioQuery,
    setAudioState,
    setAudioMixer,
    fetchFullAudioLibraryTracks,
    handleSavedAudioPlaylistCreate,
    handleSavedAudioPlaylistRename,
    handleSavedAudioPlaylistDelete,
    handleSavedAudioPlaylistBusChange,
    handleSavedAudioPlaylistLoopChange,
    handleSavedAudioPlaylistAddTrack,
    handleSavedAudioPlaylistAddCurrentTrack,
    handleSavedAudioPlaylistRemoveTrack,
    handleSavedAudioPlaylistMoveTrack,
    handleSavedAudioPlaylistPlay,
    handleAudioLoadTrack,
    handleAudioLoadPlaylist,
    handleAudioPlayingChange,
    handleAudioEnded,
    handleAudioStopBus,
    handleAudioStopAll,
    handleAudioLoopChange,
    handleAudioPlaylistLoopChange,
    handleAudioNextTrack,
    handleAudioPreviousTrack,
    handleAudioFadeIn,
    handleAudioFadeOut,
    handleAudioFadeFinish,
    handleAudioVolumeChange,
    handleAudioPlaylistToggle,
    reset
  };
}

export type AudioApi = ReturnType<typeof useAudio>;
