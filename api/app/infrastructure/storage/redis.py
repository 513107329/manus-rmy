from redis import Redis
from core.config import get_settings
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)


class RedisClient:
    def __init__(self):
        self._client: Redis | None = None
        self._setting = get_settings()

    def init(self) -> None:
        if self._client:
            logger.warning("redis客户端已初始化，无需重复操作")
            return

        try:
            self._client = Redis(
                host=self._setting.redis_host,
                port=self._setting.redis_port,
                db=self._setting.redis_db,
                password=self._setting.redis_password,
                decode_responses=True,
            )
            logger.info("Redis客户端初始化成功")
        except Exception as e:
            logger.error(f"初始化redis客户端失败：{str(e)}")
            raise

    def shutdown(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None
            logger.info("Redis客户端关闭成功")
            get_redis.cache_clear()

    @property
    def client(self) -> Redis:
        """只读属性"""
        if self._client is None:
            raise RuntimeError("Redis尚未初始化，请先初始化Redis客户端")
        return self._client


@lru_cache
def get_redis() -> RedisClient:
    return RedisClient()
