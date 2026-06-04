from app.domain.models.event import BaseEvent
from typing import AsyncGenerator
from app.domain.models.message import Message
from abc import abstractmethod
from abc import ABC
from enum import Enum


class FlowStatus(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    UPDATING = "updating"
    SUMMARIZING = "summarizing"
    COMPLETED = "completed"


class BaseFlow(ABC):
    """基础流抽象类"""

    @abstractmethod
    async def invoke(self, message: Message) -> AsyncGenerator[BaseEvent, None]:
        """流调用函数"""
        pass

    @property
    @abstractmethod
    def done(self) -> bool:
        """流是否完成"""
        pass
