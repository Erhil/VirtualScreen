import json
import mimetypes
import re
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from typing import Literal

from app.core.file_safety import atomic_write_bytes
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
VALID_AUDIO_BUSES = set(BUS_FOLDER_TO_BUS.values())
AUDIO_PLAYLISTS_PATH = ".virtualscreen/audio-playlists.json"
PLAYLIST_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")


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


@dataclass(frozen=True)
class AudioPlaylist:
    id: str
    name: str
    bus: AudioBus
    track_paths: list[str]
    loop: bool
    created_at: str
    updated_at: str


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


def _audio_playlists_path(root: Path) -> Path:
    return root / AUDIO_PLAYLISTS_PATH


def _validate_playlist_id(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Audio playlist id is required.")
    playlist_id = value.strip()
    if not PLAYLIST_ID_RE.fullmatch(playlist_id):
        raise ValueError("Audio playlist id is invalid.")
    return playlist_id


def _validate_playlist_name(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Audio playlist name is required.")
    name = value.strip()
    if not name or len(name) > 120:
        raise ValueError("Audio playlist name is invalid.")
    if any(ord(character) < 32 for character in name):
        raise ValueError("Audio playlist name is invalid.")
    return name


def _validate_playlist_bus(value: object) -> AudioBus:
    if not isinstance(value, str) or value not in VALID_AUDIO_BUSES:
        raise ValueError("Audio playlist bus is not supported.")
    return value  # type: ignore[return-value]


def _validate_playlist_timestamp(value: object, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"Audio playlist {label} is required.")
    timestamp = value.strip()
    try:
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"Audio playlist {label} is invalid.") from exc
    return timestamp


def _validate_track_path(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Audio playlist track path is invalid.")
    relative_path = normalize_relative_path(value)
    if not relative_path:
        raise ValueError("Audio playlist track path is required.")
    parts = relative_path.split("/")
    if ".virtualscreen" in parts:
        raise ValueError("Audio playlist track path cannot be internal.")
    if len(parts) < 2 or parts[0] != MUSIC_ROOT:
        raise ValueError("Audio playlist track path must be under .music.")
    if PurePosixPath(relative_path).suffix.lower() not in AUDIO_EXTENSIONS:
        raise ValueError("Audio playlist track path is not supported audio.")
    return relative_path


def _playlist_from_dict(value: object) -> AudioPlaylist:
    if not isinstance(value, dict):
        raise ValueError("Audio playlist must be an object.")
    track_paths = value.get("track_paths")
    if not isinstance(track_paths, list):
        raise ValueError("Audio playlist track_paths must be a list.")
    loop = value.get("loop")
    if not isinstance(loop, bool):
        raise ValueError("Audio playlist loop must be a boolean.")
    return AudioPlaylist(
        id=_validate_playlist_id(value.get("id")),
        name=_validate_playlist_name(value.get("name")),
        bus=_validate_playlist_bus(value.get("bus")),
        track_paths=[_validate_track_path(track) for track in track_paths],
        loop=loop,
        created_at=_validate_playlist_timestamp(value.get("created_at"), "created_at"),
        updated_at=_validate_playlist_timestamp(value.get("updated_at"), "updated_at"),
    )


def audio_playlists_from_payload(value: object) -> list[AudioPlaylist]:
    if not isinstance(value, dict):
        raise ValueError("Audio playlists payload must be an object.")
    playlists = value.get("playlists")
    if not isinstance(playlists, list):
        raise ValueError("Audio playlists payload must include a playlists list.")

    parsed = [_playlist_from_dict(playlist) for playlist in playlists]
    playlist_ids = [playlist.id for playlist in parsed]
    if len(playlist_ids) != len(set(playlist_ids)):
        raise ValueError("Audio playlist ids must be unique.")
    return parsed


def audio_playlists_payload(playlists: list[AudioPlaylist]) -> dict[str, object]:
    return {"playlists": [asdict(playlist) for playlist in playlists]}


def load_audio_playlists(root: Path) -> list[AudioPlaylist]:
    state_path = _audio_playlists_path(root)
    if not state_path.is_file():
        return []
    try:
        loaded = json.loads(state_path.read_text(encoding="utf-8"))
        return audio_playlists_from_payload(loaded)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError):
        return []


def save_audio_playlists(root: Path, value: object) -> list[AudioPlaylist]:
    playlists = audio_playlists_from_payload(value)
    state_path = _audio_playlists_path(root)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_json = json.dumps(
        audio_playlists_payload(playlists),
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    )
    state_json += "\n"
    atomic_write_bytes(state_path, state_json.encode("utf-8"))
    return playlists
