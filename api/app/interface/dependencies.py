from app.infrastructure.external.search.bing_search import BingSearchEngine
from app.infrastructure.external.json_parser.repair_json_parser import RepairJsonParser
from app.infrastructure.external.llm.openai_llm import OpenAILLM
from app.infrastructure.external.sandbox.docker_sandbox import DockerSandbox
from app.infrastructure.external.task.redis_stream_task import RedisStreamTask
from app.infrastructure.storage.database import get_uow
from app.application.services.agent_service import AgentService
from app.application.services.session_service import SessionService
from core.config import get_settings
from app.infrastructure.storage.tos import get_tos
from app.infrastructure.storage.tos import Tos
from app.application.services.file_service import FileService
from app.infrastructure.external.file_storage.tos_file_storage import TosFileStorage
from app.infrastructure.external.health_checker.postgres_checker import (
    PostgresHealthChecker,
)
import logging
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
from app.application.services.app_config_service import AppConfigService


logger = logging.getLogger(__name__)

def get_app_config_service() -> AppConfigService:
    file_app_config_repository = FileAppConfigRepository("app_config.yaml")
    return AppConfigService(app_config_repository=file_app_config_repository)


def get_file_service(tos: Tos = Depends(get_tos)) -> FileService:
    settings = get_settings()
    file_storage = TosFileStorage(
        uow_factory=get_uow, bucket=settings.tos_bucket, tos=tos
    )
    return FileService(uow_factory=get_uow, fileStorage=file_storage)


def get_session_service() -> SessionService:
    return SessionService(uow_factory=get_uow, sandbox_cls=DockerSandbox)


def get_agent_service(
    app_config_service: AppConfigService = Depends(get_app_config_service),
) -> AgentService:
    settings = get_settings()
    configs = app_config_service.get_app_config()
    return AgentService(
        uow_factory=get_uow,
        task_cls=RedisStreamTask,
        sandbox_cls=DockerSandbox,
        llm=OpenAILLM(llm_config=configs.llm_config),
        agent_config=configs.agent_config,
        mcp_config=configs.mcp_config,
        a2a_config=configs.a2a_config,
        json_parser=RepairJsonParser(),
        search_engine=BingSearchEngine(),
        file_storage=TosFileStorage(
            uow_factory=get_uow, bucket=settings.tos_bucket, tos=get_tos()
        ),
    )


def get_status_service(
    db_session: AsyncSession = Depends(get_db_session),
    redis_client: RedisClient = Depends(get_redis),
) -> StatusService:
    redis_health_checker = RedisHealthChecker(redis_client)
    postgres_health_checker = PostgresHealthChecker(db_session)
    return StatusService(
        health_checkers=[redis_health_checker, postgres_health_checker]
    )
