from app.infrastructure.storage.tos import get_tos
from app.infrastructure.storage.database import get_postgres
from app.interface.errors.exeception_handlers import register_exception_handlers
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import get_settings
from app.infrastructure.logging.logging import setup_logging
import uvicorn
import logging
from contextlib import asynccontextmanager
from app.interface.endpoints.routes import routes
from app.infrastructure.storage.redis import get_redis

openapi_tags = [{"name": "System", "description": "系统相关接口"}]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用程序生命周期管理"""

    logger = logging.getLogger(__name__)
    logger.info("FastAPI 生命周期启动中...")

    # 初始化redis
    redis = get_redis()
    await redis.init()
    logger.info("Redis客户端启动成功...")
    # 初始化数据库连接
    postgres = get_postgres()
    await postgres.init()
    logger.info("Postgres数据库启动成功...")
    # 初始化数据库连接
    tos = get_tos()
    tos.init()
    logger.info("TOS客户端启动成功...")

    try:
        yield
    finally:
        redis.shutdown()
        logger.info("Redis客户端关闭中...")
        postgres.shutdown()
        logger.info("Postgres数据库关闭中...")
        tos.shutdown()
        logger.info("TOS客户端关闭中...")


def create_app() -> FastAPI:
    """创建并配置 FastAPI 实例"""
    settings = get_settings()
    setup_logging()

    logger = logging.getLogger(__name__)
    logger.info("FastAPI 应用启动中...")

    # 创建实例
    app = FastAPI(
        title="Manus API",
        version="0.1.0",
        description="Manus 项目后端服务",
        lifespan=lifespan,
        openapi_tags=openapi_tags,
    )

    # 注册路由
    app.include_router(routes, prefix="/api")

    # 注册中间件
    app.add_middleware(
        CORSMiddleware,
        allow_headers=["*"],
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
    )

    # 注册错误处理
    register_exception_handlers(app)

    # 将配置存储在应用状态中，方便在依赖或路由中访问
    app.state.settings = settings
    return app


# 创建应用实例
app = create_app()

if __name__ == "__main__":
    # 使用字符串形式启动以支持热重载 (Reload)
    # 注意：在 api 目录下运行时，请确保 PYTHONPATH 包含当前目录
    # 推荐命令：uv run python -m app.main
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)
