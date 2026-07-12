import { useEffect, useState } from "react";

import { IconButton } from "../IconButton";
import { useAudioContext } from "../../contexts/AudioContext";
import type { AudioBus } from "../../lib/api";
import {
  AUDIO_BUSES,
  audioQueueLabel,
  displayAudioTrackTitle,
  groupAudioTracksByBus,
  playlistExpansionKey,
  resolveAudioPlaylists
} from "../../lib/audio";

export function AudioTool() {
  const {
    audioPlaylistExpansion: expansionState,
    audioMixer: mixer,
    handleAudioFadeIn: onFadeIn,
    handleAudioFadeOut: onFadeOut,
    handleAudioLoadTrack: onLoadTrack,
    handleAudioLoadPlaylist: onLoadPlaylist,
    handleSavedAudioPlaylistAddCurrentTrack: onSavedPlaylistAddCurrentTrack,
    handleSavedAudioPlaylistAddTrack: onSavedPlaylistAddTrack,
    handleSavedAudioPlaylistBusChange: onSavedPlaylistBusChange,
    handleSavedAudioPlaylistCreate: onSavedPlaylistCreate,
    handleSavedAudioPlaylistDelete: onSavedPlaylistDelete,
    handleSavedAudioPlaylistLoopChange: onSavedPlaylistLoopChange,
    handleSavedAudioPlaylistMoveTrack: onSavedPlaylistMoveTrack,
    handleSavedAudioPlaylistPlay: onSavedPlaylistPlay,
    handleSavedAudioPlaylistRemoveTrack: onSavedPlaylistRemoveTrack,
    handleSavedAudioPlaylistRename: onSavedPlaylistRename,
    handleAudioLoopChange: onLoopChange,
    handleAudioNextTrack: onNextTrack,
    onPickPath,
    handleAudioPlayingChange: onPlayingChange,
    handleAudioPlaylistLoopChange: onPlaylistLoopChange,
    handleAudioPlaylistToggle: onPlaylistToggle,
    handleAudioPreviousTrack: onPreviousTrack,
    setAudioQuery: onQueryChange,
    handleAudioStopAll: onStopAll,
    handleAudioStopBus: onStopBus,
    handleAudioVolumeChange: onVolumeChange,
    audioQuery: query,
    audioAutocompleteTracks: audioLibraryTracks,
    audioPlaylistState: savedPlaylistsState,
    audioState: state,
    t
  } = useAudioContext();
  const libraryTracks = state.status === "ready" ? state.tracks : [];
  const savedLibraryTracks = audioLibraryTracks.length > 0 ? audioLibraryTracks : libraryTracks;
  const groupsByBus = groupAudioTracksByBus(libraryTracks);
  const resolvedSavedPlaylists = resolveAudioPlaylists(
    savedPlaylistsState.playlists,
    savedLibraryTracks
  );
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistBus, setNewPlaylistBus] = useState<AudioBus>("ambient");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [trackPathDrafts, setTrackPathDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setRenameDrafts((current) => {
      const next: Record<string, string> = {};
      for (const playlist of savedPlaylistsState.playlists) {
        next[playlist.id] = current[playlist.id] ?? playlist.name;
      }
      return next;
    });
  }, [savedPlaylistsState.playlists]);

  function audioBusName(bus: AudioBus): string {
    return t(`audio.busName.${bus}`);
  }

  function handleCreatePlaylist() {
    onSavedPlaylistCreate(newPlaylistName, newPlaylistBus);
    setNewPlaylistName("");
  }

  function handleAddTrack(playlistId: string) {
    const path = trackPathDrafts[playlistId]?.trim() ?? "";
    if (!path) {
      return;
    }
    onSavedPlaylistAddTrack(playlistId, path);
    setTrackPathDrafts((drafts) => ({ ...drafts, [playlistId]: "" }));
  }

  return (
    <section aria-label={t("audio.control")} className="audio-tool" data-help-context="audio">
      <label className="audio-search-label" htmlFor="audio-search">
        {t("audio.search")}
        <input
          id="audio-search"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("audio.searchPlaceholder")}
          type="search"
          value={query}
        />
      </label>
      <section className="audio-saved-playlists" aria-label={t("audio.savedPlaylists")}>
        <div className="audio-saved-heading">
          <h3>{t("audio.savedPlaylists")}</h3>
          {savedPlaylistsState.status === "loading" && <small>{t("audio.savedLoading")}</small>}
          {savedPlaylistsState.status === "saving" && <small>{t("audio.savedSaving")}</small>}
          {savedPlaylistsState.status === "ready" && savedPlaylistsState.message && (
            <small>{savedPlaylistsState.message}</small>
          )}
          {savedPlaylistsState.status === "error" && <small>{savedPlaylistsState.message}</small>}
        </div>
        <div className="audio-saved-create-row">
          <input
            aria-label={t("audio.savedPlaylistName")}
            onChange={(event) => setNewPlaylistName(event.target.value)}
            placeholder={t("audio.savedPlaylistNamePlaceholder")}
            type="text"
            value={newPlaylistName}
          />
          <select
            aria-label={t("audio.savedPlaylistBus")}
            onChange={(event) => setNewPlaylistBus(event.target.value as AudioBus)}
            value={newPlaylistBus}
          >
            {AUDIO_BUSES.map((bus) => (
              <option key={bus} value={bus}>
                {audioBusName(bus)}
              </option>
            ))}
          </select>
          <button onClick={handleCreatePlaylist} type="button">
            {t("audio.savedNew")}
          </button>
        </div>
        {savedPlaylistsState.status !== "loading" && resolvedSavedPlaylists.length === 0 && (
          <p>{t("audio.savedEmpty")}</p>
        )}
        {resolvedSavedPlaylists.map((playlist) => {
          const currentTrack = mixer[playlist.bus].track;
          const renameDraft = renameDrafts[playlist.id] ?? playlist.name;
          const trackPathDraft = trackPathDrafts[playlist.id] ?? "";
          return (
            <section
              aria-label={t("audio.savedPlaylistRegion", { name: playlist.name })}
              className="audio-saved-playlist"
              key={playlist.id}
            >
              <div className="audio-saved-title-row">
                <input
                  aria-label={t("audio.renameSavedPlaylist", { name: playlist.name })}
                  onChange={(event) =>
                    setRenameDrafts((drafts) => ({
                      ...drafts,
                      [playlist.id]: event.target.value
                    }))
                  }
                  value={renameDraft}
                />
                <button
                  disabled={renameDraft.trim() === playlist.name}
                  onClick={() => onSavedPlaylistRename(playlist.id, renameDraft)}
                  type="button"
                >
                  {t("audio.rename")}
                </button>
                <button
                  disabled={playlist.tracks.length === 0}
                  onClick={() => onSavedPlaylistPlay(playlist.id)}
                  type="button"
                >
                  {t("audio.playSaved")}
                </button>
                <button onClick={() => onSavedPlaylistDelete(playlist.id)} type="button">
                  {t("audio.deleteSaved")}
                </button>
              </div>
              <div className="audio-saved-options-row">
                <label>
                  {t("audio.savedPlaylistBus")}
                  <select
                    aria-label={t("audio.savedPlaylistBusFor", { name: playlist.name })}
                    onChange={(event) =>
                      onSavedPlaylistBusChange(playlist.id, event.target.value as AudioBus)
                    }
                    value={playlist.bus}
                  >
                    {AUDIO_BUSES.map((bus) => (
                      <option key={bus} value={bus}>
                        {audioBusName(bus)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("audio.savedLoop")}
                  <input
                    checked={playlist.loop}
                    onChange={(event) =>
                      onSavedPlaylistLoopChange(playlist.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                </label>
                <button
                  disabled={!currentTrack}
                  onClick={() => onSavedPlaylistAddCurrentTrack(playlist.id)}
                  type="button"
                >
                  {t("audio.addCurrent")}
                </button>
              </div>
              <div className="audio-saved-add-row">
                <input
                  aria-label={t("audio.addTrackPath", { name: playlist.name })}
                  onChange={(event) =>
                    setTrackPathDrafts((drafts) => ({
                      ...drafts,
                      [playlist.id]: event.target.value
                    }))
                  }
                  placeholder=".music/..."
                  type="text"
                  value={trackPathDraft}
                />
                <button
                  onClick={() =>
                    onPickPath("audio", t("audio.chooseSavedTrack"), (path) =>
                      setTrackPathDrafts((drafts) => ({
                        ...drafts,
                        [playlist.id]: path
                      }))
                    )
                  }
                  type="button"
                >
                  {t("app.pick")}
                </button>
                <button disabled={!trackPathDraft.trim()} onClick={() => handleAddTrack(playlist.id)} type="button">
                  {t("audio.addTrack")}
                </button>
              </div>
              {playlist.track_paths.length === 0 ? (
                <p>{t("audio.noSavedTracks")}</p>
              ) : (
                <ol className="audio-saved-track-list">
                  {playlist.track_paths.map((path, index) => {
                    const track = playlist.tracks.find((candidate) => candidate.path === path);
                    return (
                      <li className={track ? "" : "audio-track-missing"} key={`${playlist.id}:${path}`}>
                        <span title={path}>
                          {track ? displayAudioTrackTitle(track) : t("audio.missingTrack", { path })}
                        </span>
                        <div className="audio-saved-track-actions">
                          <button
                            aria-label={t("audio.moveTrackUp", { path })}
                            disabled={index === 0}
                            onClick={() => onSavedPlaylistMoveTrack(playlist.id, index, -1)}
                            type="button"
                          >
                            ↑
                          </button>
                          <button
                            aria-label={t("audio.moveTrackDown", { path })}
                            disabled={index === playlist.track_paths.length - 1}
                            onClick={() => onSavedPlaylistMoveTrack(playlist.id, index, 1)}
                            type="button"
                          >
                            ↓
                          </button>
                          <button
                            aria-label={t("audio.removeTrack", { path })}
                            onClick={() => onSavedPlaylistRemoveTrack(playlist.id, path)}
                            type="button"
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </section>
      <div className="audio-buses">
        {AUDIO_BUSES.map((bus) => {
          const busState = mixer[bus];
          const groups = groupsByBus[bus];
          const busName = audioBusName(bus);
          return (
            <section className="audio-bus" aria-label={t("audio.bus", { bus: busName })} key={bus}>
              <div className="audio-bus-heading">
                <h3>{t("audio.currentBus", { bus: busName })}</h3>
                <span>
                  {t("audio.currentTrack", {
                    track: busState.track ? displayAudioTrackTitle(busState.track) : t("audio.empty")
                  })}
                </span>
              </div>
              {busState.track && (
                <div className="audio-queue-line">
                  <span>{t("audio.queueState", { queue: audioQueueLabel(busState) })}</span>
                  {busState.fadeStatus !== "idle" && (
                    <small>{busState.fadeStatus === "fading_in" ? t("audio.fadingIn") : t("audio.fadingOut")}</small>
                  )}
                </div>
              )}
              <div className="audio-player-row">
                <div className="audio-bus-actions">
                  <IconButton
                    disabled={!busState.track}
                    label={busState.playing ? t("audio.pause") : t("audio.play")}
                    name={busState.playing ? "pause" : "play"}
                    onClick={() => onPlayingChange(bus, !busState.playing)}
                  />
                  <IconButton
                    disabled={!busState.track}
                    label={t("audio.stop")}
                    name="stop"
                    onClick={() => onStopBus(bus)}
                  />
                  <IconButton
                    disabled={!busState.playlistMode}
                    label={t("audio.prev")}
                    name="previous"
                    onClick={() => onPreviousTrack(bus)}
                  />
                  <IconButton
                    disabled={!busState.playlistMode}
                    label={t("audio.next")}
                    name="next"
                    onClick={() => onNextTrack(bus)}
                  />
                  <button disabled={!busState.track} onClick={() => onFadeIn(bus)} type="button">
                    {t("audio.fadeIn")}
                  </button>
                  <button
                    disabled={!busState.track || !busState.playing}
                    onClick={() => onFadeOut(bus)}
                    type="button"
                  >
                    {t("audio.fadeOut")}
                  </button>
                  <label>
                    {t("audio.track")}
                    <input
                      checked={busState.loop}
                      onChange={(event) => onLoopChange(bus, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                  <label>
                    {t("audio.queue")}
                    <input
                      checked={busState.playlistLoop}
                      onChange={(event) => onPlaylistLoopChange(bus, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                </div>
                <label className="audio-volume">
                  <span>{t("audio.volume")}</span>
                  <input
                    aria-label={t("audio.busVolume", { bus: busName })}
                    max="1"
                    min="0"
                    onChange={(event) => onVolumeChange(bus, Number(event.target.value))}
                    step="0.01"
                    type="range"
                    value={busState.volume}
                  />
                </label>
              </div>
              <div className="audio-playlists" aria-label={t("audio.playlists", { bus: busName })}>
                {state.status === "idle" && <p>{t("audio.openLibrary")}</p>}
                {state.status === "loading" && <p>{t("audio.scanning")}</p>}
                {state.status === "error" && <p>{state.message}</p>}
                {state.status === "ready" && groups.length === 0 && <p>{t("audio.noTracks")}</p>}
                {groups.map((group) => {
                  const expanded = expansionState[playlistExpansionKey(bus, group.playlist)] ?? false;
                  return (
                    <section className="audio-playlist" key={group.playlist ?? "tracks"}>
                      <div className="audio-playlist-title-row">
                        <button
                          aria-expanded={expanded}
                          className="audio-playlist-header"
                          onClick={() => onPlaylistToggle(bus, group.playlist)}
                          type="button"
                        >
                          <span>{group.playlist ?? t("audio.tracks")}</span>
                          <small>{group.tracks.length}</small>
                        </button>
                        <button
                          aria-label={t("audio.queuePlaylist", { bus: busName, playlist: group.playlist ?? t("audio.tracks") })}
                          className="audio-playlist-play"
                          onClick={() => onLoadPlaylist(bus, group.playlist, group.tracks)}
                          type="button"
                        >
                          {t("audio.loadQueue")}
                        </button>
                      </div>
                      {expanded && (
                        <div className="audio-track-list">
                          {group.tracks.map((track) => (
                            <button
                              className="audio-result"
                              key={track.path}
                              onClick={() => onLoadTrack(track)}
                              title={track.path}
                              type="button"
                            >
                              {displayAudioTrackTitle(track)}
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <button className="audio-stop-all" onClick={onStopAll} type="button">
        {t("audio.stopAll")}
      </button>
    </section>
  );
}
