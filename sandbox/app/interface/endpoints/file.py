from app.models.file import FileWriteResult
from app.interface.schemas.file import WriteFileRequest
from app.services.file import FileService
from app.interface.service_dependencies import get_file_service
from fastapi import Depends
from app.interface.schemas.file import ReadFileRequest
from app.models.file import FileReadResult
from app.interface.schemas import Response
from fastapi import APIRouter

router = APIRouter(prefix="/file", tags=["文件模块"])


@router.post(path="/read-file", response_model=Response[FileReadResult])
async def read_file(
    request: ReadFileRequest, file_service: FileService = Depends(get_file_service)
):
    result = await file_service.read_file(
        request.filepath, request.start_line, request.end_line, request.sudo
    )
    return Response.success(data=result)


@router.post(path="/write-file", response_model=Response[FileWriteResult])
async def write_file(
    request: WriteFileRequest, file_service: FileService = Depends(get_file_service)
):
    result = await file_service.write_file(
        request.filepath,
        request.content,
        request.append,
        request.leading_newline,
        request.trailing_newline,
        request.sudo,
    )
    return Response.success(data=result)
