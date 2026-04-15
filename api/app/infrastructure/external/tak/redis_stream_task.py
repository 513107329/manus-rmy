from sqlalchemy import false
import asyncio
import logging
from typing import Dict
from app.infrastructure.external.message_queue.redis_stream_message_queue import (
    RedisStreamMessageQueue,
)
from app.domain.external.message_queue import MessageQueue
from typing import Optional
import asyncio
from app.domain.external.task import Task, TaskRunner
import uuid

logger = logging.getLogger(__name__)


class RedisStreamTask(Task):

    _task_registry: Dict[str, RedisStreamTask] = None

    def __init__(self, task_runner: TaskRunner):
        self._task_runner = task_runner
        self._id = str(uuid.uuidv4())
        self._execution_task: Optional[asyncio.Task] = None

        # 输入输出流名称
        self._input_stream_name = f"task:{self._id}:input"
        self._output_stream_name = f"task:{self._id}:output"

        self._input_stream = RedisStreamMessageQueue(self._input_stream_name)
        self._output_stream = RedisStreamMessageQueue(self._output_stream_name)

        RedisStreamTask._task_registry[self._id] = self

    @property
    def id(self) -> str:
        return self._id

    @property
    def done(self) -> bool:
        if self._execution_task is None:
            return True
        return self._execution_task.done()

    def _cleanup_registry(self):
        if self._id in RedisStreamTask._task_registry:
            del RedisStreamTask._task_registry[self._id]
            logger.info(f"Error executing task: {e}")

    async def _on_task_done(self) -> None:
        """任务结束时的回调函数"""
        if self._task_runner:
            asyncio.create_task(self._task_runner.on_done(self))

        self._cleanup_registry(self)

    async def _execute_task(self) -> None:
        try:
            await self._task_runner.invoke(self)
        except Exception as e:
            logger.error(f"Error executing task: {e}")
        finally:
            await self._on_task_done()

    async def run(self) -> None:
        if not self.done:
            self._execution_task = asyncio.create_task(self._execute_task())
            logger.info(f"任务{self._id}开始执行")

    def cancel(self) -> None:
        if not self.done and self._execution_task:
            self._execution_task.cancel()
            logger.info(f"任务{self._id}取消执行")

        self._cleanup_registry(self)
        return True

    @property
    def input_stream(self) -> MessageQueue:
        return self._input_stream

    @property
    def output_stream(self) -> MessageQueue:
        return self._output_stream

    @classmethod
    def get(cls, task_id: str) -> Optional[Task]:
        return RedisStreamTask._task_registry.get(task_id)

    @classmethod
    def create(cls, task_runner: TaskRunner) -> Task:
        return cls(task_runner)

    @classmethod
    async def destroy(cls, task_id: str) -> None:
        for task_id in RedisStreamTask._task_registry:
            task = RedisStreamTask._task_registry[task_id]
            task.cancel()

            if task._task_runner:
                await task._task_runner.destroy()

        cls._task_registry.clear()
