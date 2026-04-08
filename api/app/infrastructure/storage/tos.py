import logging
from core.config import get_settings
from tos import TosClientV2
from functools import lru_cache

logger = logging.getLogger(__name__)


class Tos:

    def __init__(self):
        self._client = None
        self._setting = get_settings()

    def init(self):
        if self._client is not None:
            logger.warning("TOS已经连接")
            return

        try:
            ak = self._setting.tos_access_key
            sk = self._setting.tos_secret_key
            endpoint = self._setting.tos_endpoint
            region = self._setting.tos_region
            self._client = TosClientV2(ak, sk, endpoint, region)
            logger.info("TOS客户端初始化成功")
        except Exception as e:
            logger.error(f"初始化TOS客户端失败：{str(e)}")
            raise

    def shutdown(self):
        if self._client is not None:
            self._client.close()
            self._client = None
            logger.info("TOS客户端关闭成功")
            get_tos.cache_clear()

    @property
    def client(self):
        if self._client is None:
            raise RuntimeError("TOS未初始化")
        return self._client


@lru_cache(maxsize=1)
def get_tos() -> Tos:
    return Tos()
