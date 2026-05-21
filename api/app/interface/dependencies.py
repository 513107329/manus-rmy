from core.config import get_settings
from app.infrastructure.storage.tos import get_tos
from app.infrastructure.storage.tos import Tos
from app.domain.repositories import file_repository
from app.application.services.file_service import FileService
from app.infrastructure.external.file_storage.tos_file_storage import TosFileStorage
from app.infrastructure.repositories.db_file_repository import DBFileRespository
from app.infrastructure.repositories.db_session_repository import DbSessionRepository
from app.infrastructure.external.health_checker.postgres_checker import (
    PostgresHealthChecker,
)
from app.infrastructure.storage.redis import RedisClient
from app.infrastructure.storage.redis import get_redis
from app.infrastructure.external.health_checker.redis_checker import RedisHealthChecker
from sqlalchemy.ext.asyncio.session import AsyncSession
from fastapi import Depends
from app.infrastructure.storage.database import get_db_session
from app.application.services.status_service import StatusService
from app.infrastructure.repositories.file_app_config_repository import (
    FileAppConfigRepository,
)
from functools import lru_cache
from app.application.services.app_config_service import AppConfigService


@lru_cache(maxsize=1)
def get_app_config_service() -> AppConfigService:
    file_app_config_repository = FileAppConfigRepository("app_config.yaml")
    return AppConfigService(app_config_repository=file_app_config_repository)


@lru_cache()
def get_file_service(
    tos: Tos = Depends(get_tos),
    db_session: AsyncSession = Depends(get_db_session),
) -> FileService:
    settings = get_settings()
    print(settings)
    file_repository = DBFileRespository(db_session)
    file_storage = TosFileStorage(
        file_repository=file_repository, bucket=settings.tos_bucket, tos=tos
    )
    return FileService(file_repository=file_repository, fileStorage=file_storage)


@lru_cache(maxsize=1)
def get_status_service(
    db_session: AsyncSession = Depends(get_db_session),
    redis_client: RedisClient = Depends(get_redis),
) -> StatusService:
    redis_health_checker = RedisHealthChecker(redis_client)
    postgres_health_checker = PostgresHealthChecker(db_session)
    return StatusService(
        health_checkers=[redis_health_checker, postgres_health_checker]
    )
