from app.domain.repositories.uow import IUnitOfWork
from typing import Callable
from app.application.errors.exceptions import NotFoundException
from app.domain.models.session import Session


class SessionService:
    def __init__(self, uow_factory: Callable[[], IUnitOfWork]):
        self.uow_factory = uow_factory
        self.uow: IUnitOfWork = uow_factory()

    async def create_session(self):
        session = Session(title="新对话")

        async with self.uow:
            await self.uow.session.save(session)
        return session

    async def get_session(self, session_id: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)

        if not session:
            raise NotFoundException(msg=f"找不到此会话{session_id}")

        return session

    async def get_sessions(self):
        async with self.uow:
            return await self.uow.session.get_all()

    async def clear_unread_message_count(self, session_id: str):
        async with self.uow:
            await self.uow.session.update_unread_message_count(session_id, 0)

    async def delete_session(self, session_id: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)

        if not session:
            raise NotFoundException(msg=f"找不到此会话{session_id}")

        async with self.uow:
            await self.uow.session.delete(session_id)

    async def update_session_title(self, session_id: str, title: str):
        session = await self.uow.session.get_by_id(session_id)

        if not session:
            raise NotFoundException(msg=f"找不到此会话{session_id}")

        await self.uow.session.update_title(session_id, title)
