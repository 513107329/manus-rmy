from app.application.services.status_service import StatusService
from fastapi import Depends
from app.interface.dependencies import get_status_service
from app.domain.models.health_status import HealthStatus
from typing import List
from app.application.errors.exceptions import NotFoundException
from app.interface.schemas import Response
from fastapi import APIRouter

router = APIRouter(prefix="/status", tags=["System"])


@router.get(
    "/health",
    response_model=Response[List[HealthStatus]],
    summary="健康检查",
    description="检查数据库，redis等是否正常",
)
async def get_status(
    status_service: StatusService = Depends(get_status_service),
) -> Response[List[HealthStatus]]:
    statuses = await status_service.check_all()
    if any(item.status == "error" for item in statuses):
        return Response.fail(code=503, data=statuses, message="服务异常")
    return Response.success(data=statuses)


@router.get(
    "/notFound",
    response_model=Response[dict],
    summary="资源未找到",
    description="抛出资源未找到错误",
)
async def get_notFound() -> Response[dict]:
    raise NotFoundException("资源未找到")
