from app.services.shell import ShellService
from fastapi import Depends
from app.interface.schemas.shell import ExecCommandRequest
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
