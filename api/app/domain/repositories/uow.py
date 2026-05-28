from abc import abstractmethod
from typing import TypeVar
from abc import ABC
from app.domain.repositories.file_repository import FileRepository
from app.domain.repositories.session_repository import SessionRepository

T = TypeVar("T", bound="IUnitOfWork")


class IUnitOfWork(ABC):
    """Uow模式协议接口"""

    file: FileRepository
    session: SessionRepository

    @abstractmethod
    async def commit(cls):
        pass

    @abstractmethod
    async def rollback(cls):
        pass

    @abstractmethod
    async def __aenter__(cls) -> T:
        pass

    @abstractmethod
    async def __aexit__(cls, exc_type, exc_val, exc_tb):
        pass
