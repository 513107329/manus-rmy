from fastapi import APIRouter
from . import status_routes, app_config_routes, file_routes


def create_routes() -> APIRouter:
    router = APIRouter()
    router.include_router(status_routes.router)
    router.include_router(app_config_routes.router)
    router.include_router(file_routes.router)
    return router


routes = create_routes()
