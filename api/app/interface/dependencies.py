from app.infrastructure.repositories.file_app_config_repository import (
    FileAppConfigRepository,
)
from functools import lru_cache
from app.application.services.app_config_service import AppConfigService


@lru_cache(maxsize=1)
def get_app_config_service() -> AppConfigService:
    file_app_config_repository = FileAppConfigRepository("app_config.yaml")
    return AppConfigService(app_config_repository=file_app_config_repository)
