from sqlalchemy import text
from app.domain.models.health_status import HealthStatus
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.external.health_checker import HealthChecker
import logging

logger = logging.getLogger(__name__)


class PostgresHealthChecker(HealthChecker):
    def __init__(self, db_session: AsyncSession):
        self._db_session = db_session

    async def check(self) -> HealthStatus:
        try:
            await self._db_session.execute(text("SELECT 1"))
            logger.info("Postgres健康状态检测成功")
            return HealthStatus(status="ok", service="postgres", detail="OK")
        except Exception as e:
            logger.error(f"Postgres健康状态检测失败: {str(e)}")
            return HealthStatus(status="error", service="postgres", detail=str(e))
