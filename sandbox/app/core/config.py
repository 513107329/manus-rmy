from pydantic_settings import SettingsConfigDict
from functools import lru_cache
from pydantic_settings import BaseSettings
from pathlib import Path

_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    log_level: str = "INFO"
    server_timeout_minutes: int = 60

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
