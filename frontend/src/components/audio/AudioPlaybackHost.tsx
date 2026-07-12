import { useAudioContext } from "../../contexts/AudioContext";
import { AUDIO_BUSES } from "../../lib/audio";
import { AudioBusPlayer } from "./AudioBusPlayer";

export function AudioPlaybackHost() {
  const { audioMixer: mixer, handleAudioEnded: onEnded, handleAudioFadeFinish: onFadeFinish } =
    useAudioContext();
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
