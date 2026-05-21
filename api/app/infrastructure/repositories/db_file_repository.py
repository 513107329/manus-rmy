import logging
from typing import Optional
from app.infrastructure.models.file import FileModel
from sqlalchemy.sql import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.repositories.file_repository import FileRepository
from app.domain.models.file import File

logger = logging.getLogger(__name__)


class DBFileRespository(FileRepository):
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session

    async def save(self, file: File) -> None:
        stmt = select(FileModel).where(FileModel.id == file.id)
        result = await self.db_session.execute(stmt)
        record = result.scalar_one_or_none()

        if not record:
            record = FileModel.from_domain(file)
            self.db_session.add(record)
            return

        record.update_from_domain(file)

    async def get_file_by_id(self, file_id: str) -> Optional[File]:
        stmt = select(FileModel).where(FileModel.id == file_id)
        result = await self.db_session.execute(stmt)
        record = result.scalar_one_or_none()

        return record.to_domain() if record else None
