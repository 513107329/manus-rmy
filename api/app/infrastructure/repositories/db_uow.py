from app.infrastructure.repositories.db_file_repository import DBFileRespository
from app.infrastructure.repositories.db_session_repository import DbSessionRepository
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker
from app.domain.repositories.uow import IUnitOfWork


class DBUnitOfWork(IUnitOfWork):
    def __init__(self, session_factory: async_sessionmaker[AsyncSession]):
        self.session_factory = session_factory
        self.db_session: Optional[AsyncSession] = None
        self.file: Optional[DBFileRespository] = None
        self.session: Optional[DbSessionRepository] = None

    async def commit(self):
        if self.db_session:
            await self.db_session.commit()

    async def rollback(self):
        if self.db_session:
            await self.db_session.rollback()

    async def __aenter__(self):
        self.db_session = self.session_factory()
        self.file = DBFileRespository(self.db_session)
        self.session = DbSessionRepository(self.db_session)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type:
                await self.rollback()
            else:
                await self.commit()
        finally:
            if self.db_session:
                await self.db_session.close()
