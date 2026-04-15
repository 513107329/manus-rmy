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
