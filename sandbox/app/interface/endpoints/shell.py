from app.interface.schemas.shell import KillProcessRequest
from app.models.shell import ShellKillResult
from app.models.shell import WriteToProcessResult
from app.interface.schemas.shell import WriteToProcessRequest
from app.interface.schemas.shell import WaitForProcessRequest
from app.models.shell import WaitProcessResult
from app.interface.errors.exceptions import BadRequestException
from app.models.shell import ShellViewResult
from app.interface.errors.exception_handler import logger
from app.services.shell import ShellService
from fastapi import Depends
from app.interface.schemas.shell import ExecCommandRequest, ViewShellRequest
from app.interface.schemas.response import Response
from fastapi import APIRouter
from app.interface.service_dependencies import get_shell_service
from app.models.shell import ShellExecResult
import os

router = APIRouter(prefix="/shell", tags=["shell模块"])


@router.post(
    path="/exec-command",
    response_model=Response[ShellExecResult],
    summary="执行shell命令",
    description="执行shell命令",
)
async def exec_command(
    request: ExecCommandRequest, shellService: ShellService = Depends(get_shell_service)
) -> Response[ShellExecResult]:

    if not request.session_id or request.session_id == "":
        request.session_id = shellService.create_session_id()
    if not request.exec_dir or request.exec_dir == "":
        request.exec_dir = os.path.expanduser("~")

    result = await shellService.exec_command(
        session_id=request.session_id,
        command=request.command,
        exec_dir=request.exec_dir,
    )
    return Response.success(data=result)


@router.post(
    path="/view_shell",
    response_model=Response[ShellViewResult],
    summary="查看shell",
    description="查看shell",
)
async def view_shell(
    request: ViewShellRequest, shellService: ShellService = Depends(get_shell_service)
) -> Response[ShellViewResult]:
    if not request.session_id or request.session_id == "":
        raise BadRequestException("会话ID不能为空")
    result = await shellService.view_shell(
        session_id=request.session_id, console=request.console
    )
    return Response.success(data=result)


@router.post(
    path="/wait_for_process",
    response_model=Response[WaitProcessResult],
    summary="等待shell进程",
    description="等待shell进程",
)
async def wait_for_process(
    request: WaitForProcessRequest,
    shellService: ShellService = Depends(get_shell_service),
) -> Response[WaitProcessResult]:
    if not request.session_id or request.session_id == "":
        raise BadRequestException("会话ID不能为空")
    result = await shellService.wait_for_process(
        session_id=request.session_id, seconds=request.seconds
    )
    return Response.success(message=f"返回状态码为{result.returncode}", data=result)


@router.post(
    path="/write-to-process",
    response_model=Response[WriteToProcessResult],
    summary="向shell进程写入数据",
    description="向shell进程写入数据",
)
async def write_to_process(
    request: WriteToProcessRequest,
    shellService: ShellService = Depends(get_shell_service),
) -> Response[WriteToProcessResult]:
    if not request.session_id or request.session_id == "":
        raise BadRequestException("会话ID不能为空")
    result = await shellService.write_to_process(
        session_id=request.session_id, data=request.inputText, enter=request.enter
    )
    return Response.success(message="向进程写入数据成功", data=result)


@router.post(
    path="/kill-process",
    response_model=Response[ShellKillResult],
    summary="杀死shell进程",
    description="杀死shell进程",
)
async def kill_process(
    request: KillProcessRequest,
    shellService: ShellService = Depends(get_shell_service),
) -> Response[ShellKillResult]:
    if not request.session_id or request.session_id == "":
        raise BadRequestException("会话ID不能为空")
    result = await shellService.kill_process(session_id=request.session_id)
    return Response.success(
        message="进程已终止" if result.status == "terminated" else "进程已结束",
        data=result,
    )
