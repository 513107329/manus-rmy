from fastapi import APIRouter
from . import file, shell, supervisor


def create_api_routes() -> APIRouter:
    apiRouter = APIRouter()

    apiRouter.include_router(file.router)
    apiRouter.include_router(shell.router)
    apiRouter.include_router(supervisor.router)

    return apiRouter


router = create_api_routes()
