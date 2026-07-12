import type { AudioBus } from "../../lib/api";
import { AUDIO_BUSES, type AudioMixerState } from "../../lib/audio";
import { AudioBusPlayer } from "./AudioBusPlayer";

export function AudioPlaybackHost({
  mixer,
  onEnded,
  onFadeFinish
}: {
  mixer: AudioMixerState;
  onEnded: (bus: AudioBus) => void;
  onFadeFinish: (bus: AudioBus) => void;
}) {
  return (
    <div className="audio-playback-host">
      {AUDIO_BUSES.map((bus) => (
        <AudioBusPlayer
          bus={bus}
          key={bus}
          onEnded={onEnded}
          onFadeFinish={onFadeFinish}
          state={mixer[bus]}
        />
      ))}
    </div>
  );
}
