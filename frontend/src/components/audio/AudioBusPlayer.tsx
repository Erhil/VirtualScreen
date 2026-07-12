import { useEffect, useRef } from "react";

import { buildMediaUrl, type AudioBus } from "../../lib/api";
import { audioFadeProgress, busLabel, type AudioBusState } from "../../lib/audio";

export function AudioBusPlayer({
  bus,
  state,
  onEnded,
  onFadeFinish
}: {
  bus: AudioBus;
  state: AudioBusState;
  onEnded: (bus: AudioBus) => void;
  onFadeFinish: (bus: AudioBus) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    audio.loop = state.playlistMode ? false : state.loop;
    if (state.track && state.playing) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [state.loop, state.playing, state.playlistMode, state.track?.path]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    let frame = 0;
    let cancelled = false;

    const applyVolume = (now: number) => {
      const fade = audioFadeProgress(state, now);
      audio.volume = Math.min(Math.max(state.volume * fade.factor, 0), 1);
      if (state.fadeStatus !== "idle" && fade.progress < 1 && !cancelled) {
        frame = window.requestAnimationFrame(applyVolume);
        return;
      }
      if (state.fadeStatus !== "idle" && !cancelled) {
        onFadeFinish(bus);
      }
    };

    applyVolume(performance.now());

    return () => {
      cancelled = true;
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [
    bus,
    onFadeFinish,
    state.fadeDurationMs,
    state.fadeStartedAtMs,
    state.fadeStatus,
    state.volume
  ]);

  if (!state.track) {
    return null;
  }

  return (
    <audio
      aria-label={`${busLabel(bus)} audio`}
      onEnded={() => onEnded(bus)}
      ref={audioRef}
      src={buildMediaUrl(state.track.path)}
    />
  );
}
