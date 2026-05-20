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
    language: str = "en"
    language_dir: Path = Field(default=Path("lang"))
    llm_base_url: str = ""
    llm_model: str = ""
    llm_api_key: str = ""
    llm_timeout_seconds: float = Field(default=90, gt=0)
    llm_max_input_chars: int = Field(default=12000, gt=0)
    llm_max_output_tokens: int = Field(default=800, gt=0)
    llm_temperature: float = Field(default=0.7, ge=0, le=2)

    @property
    def resolved_world_root(self) -> Path:
        return get_active_world_root(self.worlds_root, self.world_root)

    @property
    def resolved_worlds_root(self) -> Path:
        return self.worlds_root.expanduser().resolve()

    @property
    def ui_language(self) -> str:
        return self.language.strip() or "en"

    @property
    def resolved_language_dir(self) -> Path:
        expanded = self.language_dir.expanduser()
        if expanded.is_absolute():
            return expanded.resolve()
        cwd_path = expanded.resolve()
        if cwd_path.exists():
            return cwd_path
        return (Path(__file__).resolve().parents[3] / expanded).resolve()

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_base_url.strip() and self.llm_model.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
