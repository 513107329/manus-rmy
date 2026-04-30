from fastapi import Request
from starlette.exceptions import HTTPException
from app.application.errors.exceptions import AppException
from starlette.responses import JSONResponse
import logging
from fastapi import FastAPI
from app.interface.schemas.response import Response


def register_exception_handlers(app: FastAPI):

    logger = logging.getLogger(__name__)

    @app.exception_handler(AppException)
    def app_exception_handler(req: Request, e: AppException):
        logger.error(f"App Exception: {e.code} - {e.msg}")
        return JSONResponse(
            status_code=e.status_code,
            content=Response(
                code=e.code,
                msg=e.msg,
                data={},
            ).model_dump(),
        )

    @app.exception_handler(HTTPException)
    def http_exception_handler(req: Request, e: HTTPException):
        logger.error(f"HTTP Exception: {e.status_code} - {e.detail}")
        return JSONResponse(
            status_code=e.status_code,
            content=Response(
                code=e.status_code,
                msg=e.detail,
                data={},
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    def exception_handler(req: Request, e: Exception):
        logger.error(f"Exception: {e}")
        return JSONResponse(
            status_code=500,
            content=Response(
                code=500,
                msg="服务器内部错误，请稍后重试",
                data={},
            ).model_dump(),
        )
