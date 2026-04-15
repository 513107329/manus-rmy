from typing import Optional
from app.domain.external.message_queue import MessageQueue
from typing import Protocol
from abc import ABC, abstractmethod


class TaskRunner(ABC):
    @abstractmethod
    async def run(self, task: Task):
        raise NotImplementedError

    @abstractmethod
    async def destroy(self):
        raise NotImplementedError

    @abstractmethod
    async def on_done(self, task: Task):
        raise NotImplementedError


class Task(Protocol):
    async def run(self) -> None: ...

    def cancel(self) -> None: ...

    @property
    def input_stream(self) -> MessageQueue: ...

    @property
    def output_stream(self) -> MessageQueue: ...

    @property
    def id(self) -> str: ...

    @property
    def done(self) -> bool: ...

    @classmethod
    def get(cls, task_id: str) -> Optional[Task]: ...

    @classmethod
    def create(cls, taskRunner: TaskRunner) -> Task: ...

    @classmethod
    def destroy(cls, task_id: str) -> None: ...
