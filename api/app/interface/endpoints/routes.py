from app.interface.endpoints import (
    session_routes,
    status_routes,
    app_config_routes,
    file_routes,
)
from fastapi import APIRouter


def create_routes() -> APIRouter:
    router = APIRouter()
    router.include_router(status_routes.router)
    router.include_router(app_config_routes.router)
    router.include_router(file_routes.router)
    router.include_router(session_routes.router)
    return router


routes = create_routes()
