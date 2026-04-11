from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path

# .env 文件位于 api/ 目录，config.py 位于 api/core/，所以上一级目录就是 api/
_ENV_FILE = Path(__file__).parent.parent / ".env"


class Settings(BaseSettings):
    env: str = "develop"
    log_level: str = "INFO"
    app_config_filepath: str = "config.yaml"

    # 数据库相关配置
    sql_alchemy_database_url: str = ""
    # redis相关配置
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str | None = None
    redis_db: int = 0

    # tos相关配置
    tos_access_key: str = ""
    tos_secret_key: str = ""
    tos_endpoint: str = ""
    tos_region: str = ""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore"
    )


@lru_cache(maxsize=1)
def get_settings():
    return Settings()
