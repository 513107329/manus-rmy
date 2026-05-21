from app.infrastructure.repositories.db_session_repository import DbSessionRepository
from sqlalchemy.ext.asyncio.session import AsyncSession
from fastapi import Depends
from app.infrastructure.storage.database import get_db_session
from functools import lru_cache


@lru_cache()
def get_db_session_repository(
    db_session: AsyncSession = Depends(get_db_session),
) -> DbSessionRepository:
    return DbSessionRepository(db_session)
