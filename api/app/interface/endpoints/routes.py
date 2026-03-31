from fastapi import APIRouter
from . import status_routes
import logging


def create_routes() -> APIRouter:
    router = APIRouter()
    router.include_router(status_routes.router)
    return router


routes = create_routes()
