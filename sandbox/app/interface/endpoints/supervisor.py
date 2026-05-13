from email import message
from app.interface.schemas.supervisor import SupervisorTimeoutRequest
from app.models.supervisor import SupervisorTimeout
from app.models.supervisor import SupervisorActionResult
from app.services.supervisor import SupervisorService
from app.interface.service_dependencies import get_supervisor_service
from app.models.supervisor import ProcessInfo
from app.interface.schemas import Response
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/supervisor", tags=["Supervisor模块"])


@router.get(path="/status", response_model=Response[list[ProcessInfo]])
async def get_status(
    supervisor_service: SupervisorService = Depends(get_supervisor_service),
):
    result = await supervisor_service.get_all_status()
    return Response.success(data=result, message="获取成功")


@router.post(path="/stop-all-process", response_model=Response[SupervisorActionResult])
async def stop_all_process(
    supervisor_service: SupervisorService = Depends(get_supervisor_service),
):
    result = await supervisor_service.stop_all_process()
    return Response.success(data=result, message="停止成功")

@router.post(path="/start-all-process", response_model=Response[SupervisorActionResult])
async def start_all_process(
    supervisor_service: SupervisorService = Depends(get_supervisor_service),
):
    result = await supervisor_service.start_all_process()
    return Response.success(data=result, message="启动成功")

@router.post(path="/shutdown", response_model=Response[SupervisorActionResult])
async def shutdown(
    supervisor_service: SupervisorService = Depends(get_supervisor_service),
):
    result = await supervisor_service.shutdown()
    return Response.success(data=result, message="关闭成功")

@router.post(path="/restart", response_model=Response[SupervisorActionResult])
async def restart(
    supervisor_service: SupervisorService = Depends(get_supervisor_service),
):
    result = await supervisor_service.restart()
    return Response.success(data=result, message="重启成功")

@router.post(path="/active-timeout", response_model = Response[SupervisorTimeout])
async def active_timeout(request: SupervisorTimeoutRequest, supervisor_service: SupervisorService = Depends(get_supervisor_service)):
    result = await supervisor_service.active_timeout(request.minutes)
    supervisor_service.enable_expand()

    return Response.success(
        message=f"超时销毁已设置",
        data=result
    )

@router.post(path="/extend-timeout", response_model = Response[SupervisorTimeout])
async def extend_timeout(request: SupervisorTimeoutRequest, supervisor_service: SupervisorService = Depends(get_supervisor_service)):
    # 延长超时时间，并且关闭自动保活
    result = await supervisor_service.extend_timeout(request.minutes)
    supervisor_service.disable_expand()

    return Response.success(
        message=f"已延长超时时间",
        data=result
    )

@router.post(path="/cancel-timeout", response_model = Response[SupervisorTimeout])
async def cancel_timeout(supervisor_service: SupervisorService = Depends(get_supervisor_service)):
    # 延长超时时间，并且关闭自动保活
    result = await supervisor_service.cancel_timeout()

    return Response.success(
        message=f"销毁事件已取消",
        data=result
    )

@router.post(path="/timeout-status", response_model = Response[SupervisorTimeout])
async def cancel_timeout(supervisor_service: SupervisorService = Depends(get_supervisor_service)):
    # 延长超时时间，并且关闭自动保活
    result = await supervisor_service.get_timeout_status()

    msg = "未生成销毁事件" if not result.active else f"剩余分钟数: {result.remaining_seconds // 60}"
    return Response.success(
        message=msg,
        data=result
    )


