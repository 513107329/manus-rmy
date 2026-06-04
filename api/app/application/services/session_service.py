from app.domain.external.sandbox import Sandbox
from app.interface.schemas.event import EventMapper
from app.interface.schemas.session import GetSessionResponse
from app.domain.repositories.uow import IUnitOfWork
from typing import Callable
from app.application.errors.exceptions import NotFoundException
from app.domain.models.session import Session


class SessionService:
    def __init__(
        self, uow_factory: Callable[[], IUnitOfWork], sandbox_cls: Callable[[], Sandbox]
    ):
        self.uow_factory = uow_factory
        self.uow: IUnitOfWork = uow_factory()
        self.sandbox_cls: Callable[[], Sandbox] = sandbox_cls

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

    async def clear_unread_msg_count(self, session_id: str):
        async with self.uow:
            await self.uow.session.update_unread_msg_count(session_id, 0)

    async def delete_session(self, session_id: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)

            if not session:
                raise NotFoundException(msg=f"找不到此会话{session_id}")

            await self.uow.session.delete(session_id)

    async def update_session_title(self, session_id: str, title: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)

            if not session:
                raise NotFoundException(msg=f"找不到此会话{session_id}")

            await self.uow.session.update_title(session_id, title)

    async def get_session_files(self, session_id: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)

            if not session:
                raise NotFoundException(msg=f"找不到此会话{session_id}")

            return session.files

    async def get_session_file(self, session_id: str, filepath: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)

            if not session:
                raise NotFoundException(msg=f"找不到此会话{session_id}")

            if not session.sandbox_id:
                raise NotFoundException(msg=f"此会话未创建沙箱")
            sandbox: Sandbox = await self.sandbox_cls.get(session.sandbox_id)
            if not sandbox:
                raise NotFoundException(msg=f"找不到或者销毁了此会话{session_id}的沙箱")
            result = await sandbox.file_read(filepath)
            if not result.success:
                raise NotFoundException(msg=f"读取文件失败:{result.error}")
            return result.data

    async def read_shell_output(self, session_id: str, shell_session_id: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)

            if not session:
                raise NotFoundException(msg=f"找不到此会话{session_id}")

            if not session.sandbox_id:
                raise NotFoundException(msg=f"此会话未创建沙箱")
            sandbox: Sandbox = await self.sandbox_cls.get(session.sandbox_id)
            if not sandbox:
                raise NotFoundException(msg=f"找不到或者销毁了此会话{session_id}的沙箱")
            result = await sandbox.view_shell(shell_session_id, True)
            if not result.success:
                raise NotFoundException(msg=f"读取shell失败:{result.error}")
            return result.data

    async def get_sandbox_vnc_url(self, session_id: str):
        async with self.uow:
            session = await self.uow.session.get_by_id(session_id)

            if not session:
                raise NotFoundException(msg=f"找不到此会话{session_id}")

            if not session.sandbox_id:
                raise NotFoundException(msg=f"此会话未创建沙箱")
            sandbox: Sandbox = await self.sandbox_cls.get(session.sandbox_id)
            if not sandbox:
                raise NotFoundException(msg=f"找不到或者销毁了此会话{session_id}的沙箱")
            return sandbox.vnc_url
