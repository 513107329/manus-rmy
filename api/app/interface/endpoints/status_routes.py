from app.application.errors.exceptions import NotFoundException
from app.interface.schemas import Response
from fastapi import APIRouter

router = APIRouter(prefix="/status", tags=["System"])


@router.get(
    "/health",
    response_model=Response[dict],
    summary="健康检查",
    description="检查数据库，redis等是否正常",
)
async def get_status() -> Response[dict]:
    return Response.success(data={"status": "ok"})


@router.get(
    "/notFound",
    response_model=Response[dict],
    summary="资源未找到",
    description="抛出资源未找到错误",
)
async def get_notFound() -> Response[dict]:
    raise NotFoundException("资源未找到")
