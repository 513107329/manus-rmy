import logging
from starlette.exceptions import HTTPException
from app.interface.errors.exceptions import AppException
from fastapi.responses import JSONResponse
from fastapi import Request, status, FastAPI
from app.interface.schemas.response import Response

logger = logging.getLogger(__name__)


def register_exception_handler(app: FastAPI) -> None:

    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request, exc: AppException
    ) -> JSONResponse:
        logger.error(f"AppException error: {str(exc)}")
        return JSONResponse(
            status_code=exc.status_code,
            content=Response(
                code=exc.status_code,
                message=exc.msg,
                data=exc.data,
            ).model_dump(),
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        logger.error(f"HTTPException error: {str(exc)}")
        return JSONResponse(
            status_code=exc.status_code,
            content=Response(
                code=exc.status_code,
                message=exc.detail,
                data=None,
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error(f"Exception error: {str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=Response(
                code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                message="Internal Server Error",
                data=None,
            ).model_dump(),
        )
