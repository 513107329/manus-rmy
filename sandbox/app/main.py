from app.interface.errors.exception_handler import register_exception_handler
from app.interface.endpoints.routes import router
from app.infrastructure.logging.logging import setup_logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("manus沙箱正在初始化")
    try:
        yield
    finally:
        logger.info("manus沙箱正在关闭")


openapi_tags = [
    {
        "name": "文件模块",
        "description": "文件模块",
    },
    {
        "name": "shell模块",
        "description": "shell模块",
    },
    {
        "name": "Supervisor模块",
        "description": "Supervisor模块",
    },
]

app = FastAPI(
    title="Manus沙箱系统",
    description="该沙箱系统中预装了Chrome等",
    lifespan=lifespan,
    openapi_tags=openapi_tags,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handler(app)

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
