from app.domain.models.health_status import HealthStatus
from app.domain.external.health_checker import HealthChecker
from app.infrastructure.storage.redis import RedisClient
import logging

logger = logging.getLogger(__name__)


class RedisHealthChecker(HealthChecker):
    def __init__(self, redisClient: RedisClient):
        self._redisClient = redisClient

    async def check(self) -> HealthStatus:
        logger.info("正在检测Redis健康状态...")
        try:
            await self._redisClient.client.ping()
            logger.info("Redis健康状态检测成功")
            return HealthStatus(status="ok", service="redis", detail="OK")
        except Exception as e:
            logger.error(f"Redis健康状态检测失败: {e}")
            return HealthStatus(status="error", service="redis", detail=str(e))
