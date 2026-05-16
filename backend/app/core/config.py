from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.world_library import default_worlds_root, get_active_world_root


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VIRTUALSCREEN_",
        env_file=".env",
        extra="ignore",
    )

    world_root: Path = Field(default=Path("sample-world"))
    worlds_root: Path = Field(default_factory=default_worlds_root)
    host: str = "127.0.0.1"
    port: int = 8000
    lan_mode: bool = False
    access_token: str | None = None
    watch_world: bool = False

    @property
    def resolved_world_root(self) -> Path:
        return get_active_world_root(self.worlds_root, self.world_root)

    @property
    def resolved_worlds_root(self) -> Path:
        return self.worlds_root.expanduser().resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
