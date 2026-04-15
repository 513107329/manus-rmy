from typing import Optional
from typing import Tuple
import uuid
import logging
import time
import asyncio
from app.infrastructure.storage.redis import get_redis
from app.domain.external.message_queue import MessageQueue

logger = logging.getLogger(__name__)


class RedisStreamMessageQueue(MessageQueue):
    def __init__(self, stream_name):
        self._redis_client = get_redis()
        self._stream_name = stream_name
        self._lock_expire_seconds = 10

    async def _acquire_lock(
        self, lock_key: str, timeout_seconds: int = 5
    ) -> Optional[str]:
        lock_value = str(uuid.uuid4())
        end_time = time.time() + timeout_seconds
        while time.time() < end_time:
            if await self._redis_client.set(
                lock_key, lock_value, nx=True, ex=self._lock_expire_seconds
            ):
                return lock_value
            await asyncio.sleep(0.1)
        return None

    async def _release_lock(self, lock_key: str, lock_value: str) -> bool:
        redis_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        try:
            result = await self._redis_client.eval(
                redis_script, 1, lock_key, lock_value
            )
            return result == 1
        except Exception as e:
            logger.error(f"Error releasing lock: {e}")
            return False

    async def put(self, message: str) -> str:
        logger.info(
            f"Putting message to stream: {self._stream_name}, message: {message}"
        )
        return await self._redis_client.xadd(self._stream_name, {"message": message})

    async def get(self, start_id: str = None, block_ms: int = None) -> Tuple[str, any]:
        if start_id is None:
            start_id = "0"

        if block_ms is None:
            block_ms = 0

        messages = await self._redis_client.xread(
            {self._stream_name: start_id},
            count=1,
            block=block_ms,
        )
        if not messages:
            return None, None

        message = messages[0][1]
        if message is None:
            return None, None

        message_id, message_data = message[0]
        try:
            return message_id, message_data.get("message")
        except Exception as e:
            logger.error(f"Error getting message from stream: {e}")
            return None, None

    async def pop(self):
        lock_key = f"lock:{self._stream_name}:pop"
        lock_value = await self._acquire_lock(lock_key, 5)
        if not lock_value:
            return None, None
        try:
            messages = await self._redis_client.xrange(
                self._stream_name, "-", "+", count=1
            )
            if not messages:
                return None, None
            message_id, message_data = messages[0]
            await self._redis_client.xdel(self._stream_name, message_id)
            return message_id, message_data.get("message")
        except Exception as e:
            logger.error(f"Error popping message from stream: {e}")
            return None, None
        finally:
            await self._release_lock(lock_key, lock_value)

    async def clear(self) -> None:
        await self._redis_client.xtrim(self._stream_name, 0)

    async def size(self) -> int:
        return await self._redis_client.xlen(self._stream_name)

    async def is_empty(self) -> bool:
        return await self.size() == 0

    async def delete_message(self, message_id: str) -> None:
        await self._redis_client.xdel(self._stream_name, message_id)
