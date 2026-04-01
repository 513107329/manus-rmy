from typing import Optional
import logging
from core.config import get_settings
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
    create_async_engine,
)

logger = logging.getLogger(__name__)


class Postgres:
    def __init__(self):
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker] = None
        self._settings = get_settings()

    async def init(self) -> None:
        if self._engine is not None:
            logger.warning("数据库已经连接")
            return
        try:
            self._engine = create_async_engine(
                self._settings.sql_alchemy_database_url,
                echo=True if self._settings.env == "development" else False,
            )
            self._session_factory = async_sessionmaker(
                autocommit=False, autoflush=False, bind=self._engine
            )
            logger.info("数据库会话工厂创建完毕")

            async with self._engine.begin() as async_conn:
                await async_conn.execute(
                    text('CREATE EXTENTION IF NOT EXIST "uuid-ossp"')
                )
                logger.info("成功连接POSTGRES并且安装uuid-ossp")

        except Exception as e:
            logger.error(f"数据库连接失败, {str(e)}")
            raise

    def shutdown(self):
        self._session_factory = None
        self._engine.dispose()
        self._engine = None
        get_postgres.cache_clear()
        logger.info("数据库连接已关闭")

    @property
    def session_factory(self) -> async_sessionmaker[AsyncSession]:
        if self._session_factory is None:
            raise RuntimeError("Postgres未初始化")
        return self._session_factory


@lru_cache(maxsize=1)
def get_postgres() -> Postgres:
    return Postgres()


async def get_db_session() -> AsyncSession:
    db = get_postgres()
    session_factory = db.session_factory

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise
