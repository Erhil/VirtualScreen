import mimetypes
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from app.core.paths import normalize_relative_path

AudioBus = Literal["ambient", "music", "effect"]

MUSIC_ROOT = ".music"
BUS_FOLDER_TO_BUS: dict[str, AudioBus] = {
    "ambient": "ambient",
    "effects": "effect",
    "music": "music",
}
AUDIO_CONTENT_TYPES = {
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
}
AUDIO_EXTENSIONS = set(AUDIO_CONTENT_TYPES)


@dataclass(frozen=True)
class AudioTrack:
    path: str
    name: str
    title: str
    bus: AudioBus
    playlist: str | None
    extension: str
    content_type: str
    size: int
    modified_at: datetime


def audio_content_type(path: Path) -> str:
    fallback = AUDIO_CONTENT_TYPES[path.suffix.lower()]
    guessed_type, _ = mimetypes.guess_type(path.name)
    return guessed_type or fallback


def _track_from_path(root: Path, path: Path) -> AudioTrack | None:
    if path.suffix.lower() not in AUDIO_EXTENSIONS:
        return None

    relative_path = normalize_relative_path(path.relative_to(root).as_posix())
    parts = relative_path.split("/")
    if len(parts) < 3 or parts[0] != MUSIC_ROOT:
        return None

    bus = BUS_FOLDER_TO_BUS.get(parts[1])
    if bus is None:
        return None

    playlist_parts = parts[2:-1]
    playlist = "/".join(playlist_parts) if playlist_parts else None
    stat = path.stat()
    return AudioTrack(
        path=relative_path,
        name=path.name,
        title=path.stem,
        bus=bus,
        playlist=playlist,
        extension=path.suffix.lower().lstrip("."),
        content_type=audio_content_type(path),
        size=stat.st_size,
        modified_at=datetime.fromtimestamp(stat.st_mtime, tz=UTC),
    )


def scan_audio_library(
    root: Path,
    *,
    query: str = "",
    bus: AudioBus | None = None,
) -> list[AudioTrack]:
    music_root = root / MUSIC_ROOT
    if not music_root.exists():
        return []

    query_text = query.strip().lower()
    tracks: list[AudioTrack] = []
    for path in sorted(
        music_root.rglob("*"),
        key=lambda item: item.relative_to(root).as_posix().lower(),
    ):
        if not path.is_file():
            continue
        track = _track_from_path(root, path)
        if track is None:
            continue
        if bus and track.bus != bus:
            continue
        if query_text:
            haystack = " ".join(
                value
                for value in [track.title, track.name, track.path, track.playlist or "", track.bus]
                if value
            ).lower()
            if query_text not in haystack:
                continue
        tracks.append(track)
    return tracks
