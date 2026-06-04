from sqlalchemy.dialects.postgresql.json import JSONB
from sqlalchemy.sql import func
from typing import Optional, List
from datetime import datetime
import logging
from sqlalchemy.sql import select, delete, update, cast
from sqlalchemy.ext.asyncio.session import AsyncSession
from app.domain.models.memory import Memory
from app.domain.models.event import BaseEvent
from app.domain.models.session import SessionStatus
from app.domain.repositories.session_repository import SessionRepository
from app.domain.models.file import File
from app.infrastructure.models import SessionModel
from app.domain.models.session import Session

logger = logging.getLogger(__name__)


class DbSessionRepository(SessionRepository):
    def __init__(self, db_session: AsyncSession) -> None:
        """完成数据库会话初始化"""
        self.db_session = db_session

    async def save(self, session: Session) -> None:
        """保存会话"""
        stmt = select(SessionModel).where(SessionModel.id == session.id)
        result = await self.db_session.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            record = SessionModel.from_domain(session)
            self.db_session.add(record)
            return
        record.update_from_domain(session)

    async def get_all(self) -> List[Session]:
        """获取所有会话"""
        stmt = select(SessionModel).order_by(SessionModel.latest_message_at.desc())
        result = await self.db_session.execute(stmt)
        records = result.scalars().all()
        return [record.to_domain() for record in records]

    async def get_by_id(self, id: str) -> Optional[Session]:
        """获取会话"""
        stmt = select(SessionModel).where(SessionModel.id == id)
        result = await self.db_session.execute(stmt)
        record = result.scalar_one_or_none()
        return record.to_domain() if record else None

    async def delete(self, id: str) -> None:
        """删除会话"""
        stmt = delete(SessionModel).where(SessionModel.id == id)
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def update_title(self, id: str, title: str) -> None:
        """更新会话标题"""
        stmt = update(SessionModel).where(SessionModel.id == id).values(title=title)
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def update_latest_message(
        self, id: str, latest_message: str, timestamp: datetime
    ) -> None:
        """更新会话最新消息"""
        stmt = (
            update(SessionModel)
            .where(SessionModel.id == id)
            .values(latest_msg=latest_message, latest_message_at=timestamp)
        )
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def update_unread_msg_count(self, id: str, unread_msg_count: int) -> None:
        """更新会话未读消息数"""
        stmt = (
            update(SessionModel)
            .where(SessionModel.id == id)
            .values(unread_msg_count=unread_msg_count)
        )
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def update_status(self, id: str, status: SessionStatus) -> None:
        """更新会话状态"""
        stmt = update(SessionModel).where(SessionModel.id == id).values(status=status)
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def increment_unread_msg_count(self, id: str) -> None:
        """增加会话未读消息数"""
        stmt = (
            update(SessionModel)
            .where(SessionModel.id == id)
            .values(
                unread_msg_count=func.coalesce(SessionModel.unread_msg_count, 0)
                + 1
            )
        )
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def decrement_unread_msg_count(self, id: str) -> None:
        """减少会话未读消息数"""
        stmt = (
            update(SessionModel)
            .where(SessionModel.id == id)
            .values(
                unread_msg_count=func.greatest(
                    func.coalesce(SessionModel.unread_msg_count, 0) - 1, 0
                )
            )
        )
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def add_event(self, id: str, event: BaseEvent) -> None:
        """添加事件"""
        event_data = event.model_dump(mode="json")
        stmt = (
            update(SessionModel)
            .where(SessionModel.id == id)
            .values(
                events=func.coalesce(SessionModel.events, cast([], JSONB))
                + cast([event_data], JSONB)
            )
        )
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def add_file(self, id: str, file: File) -> None:
        """添加文件"""
        file_data = file.model_dump(mode="json")
        stmt = (
            update(SessionModel)
            .where(SessionModel.id == id)
            .values(
                files=func.coalesce(SessionModel.files, cast([], JSONB))
                + cast([file_data], JSONB)
            )
        )
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def get_file_by_path(self, id: str, path: str) -> Optional[File]:
        """获取文件"""
        stmt = select(SessionModel.files).where(SessionModel.id == id)
        result = await self.db_session.execute(stmt)
        files = result.scalar_one_or_none()
        if not files:
            return None
        for file in files:
            if file.get("file_path", "") == path:
                return File(**file)
        return None

    async def get_file_by_id(self, id: str, file_id: str) -> Optional[File]:
        """获取文件"""
        stmt = select(SessionModel.files).where(SessionModel.id == id)
        result = await self.db_session.execute(stmt)
        files = result.scalar_one_or_none()
        if not files:
            return None
        for file in files:
            if file.get("id") == file_id:
                return File(**file)
        return None

    async def save_memory(self, id: str, agent_name: str, memory: Memory) -> None:
        """保存记忆"""
        logger.debug("保存记忆中...")
        memory_data = memory.model_dump(mode="json")
        stmt = (
            update(SessionModel)
            .where(SessionModel.id == id)
            .values(
                memories=func.coalesce(SessionModel.memories, cast({}, JSONB))
                + cast({agent_name: memory_data}, JSONB)
            )
        )
        result = await self.db_session.execute(stmt)
        if result.rowcount == 0:
            raise ValueError(f"会话 {id} 不存在")

    async def remove_file(self, id: str, file_id: str) -> None:
        """删除文件"""
        # 1.查询会话记录并加锁
        stmt = select(SessionModel).where(SessionModel.id == id).with_for_update()
        result = await self.db_session.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            raise ValueError(f"会话 {id} 不存在")

        if not record.files:
            return
        origin_file_length = len(record.files)
        # 2.过滤文件
        new_files = [file for file in record.files if file.get("id") != file_id]
        if len(new_files) == origin_file_length:
            return
        # 3.保存会话记录
        record.files = new_files

    async def remove_memory(self, id: str, agent_name: str) -> None:
        """删除记忆"""
        logger.debug("删除记忆中...")
        stmt = select(SessionModel).where(SessionModel.id == id).with_for_update()
        result = await self.db_session.execute(stmt)
        record = result.scalar_one_or_none()
        if not record:
            raise ValueError(f"会话 {id} 不存在")
        del record.memories[agent_name]

    async def get_memory(self, id: str, agent_name: str) -> Optional[Memory]:
        """获取记忆"""
        logger.debug("获取记忆中...")
        stmt = select(SessionModel.memories[agent_name]).where(SessionModel.id == id)
        result = await self.db_session.execute(stmt)
        memory = result.scalar_one_or_none()
        if not memory:
            return Memory(messages=[])
        return Memory(**memory)
