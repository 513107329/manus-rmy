from app.interface.schemas.file import FileDeleteRequest
from app.interface.schemas.file import FileExistsRequest
from app.models.file import FileDeleteResult
from app.models.file import FileExistsResult
from starlette.responses import FileResponse
from typing import Optional
from fastapi.datastructures import UploadFile
from fastapi import Form, File
from app.models.file import FileUploadResult
from app.interface.schemas.file import FileFindRequest
from app.models.file import FileFindResult
from app.models.file import FileSearchResult
from app.interface.schemas.file import FileSearchRequest
from app.models.file import FileWriteResult
from app.interface.schemas.file import WriteFileRequest
from app.services.file import FileService
from app.interface.service_dependencies import get_file_service
from fastapi import Depends, APIRouter
from app.interface.schemas.file import ReadFileRequest
from app.models.file import FileReadResult
from app.interface.schemas import Response
from app.interface.schemas.file import FileReplaceRequest
from app.models.file import FileReplaceResult
import os

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


@router.post(path="/replace-in-file", response_model=Response[FileReplaceResult])
async def replace_in_file(
    request: FileReplaceRequest, file_service: FileService = Depends(get_file_service)
):
    result = await file_service.replace_in_file(
        request.filepath,
        request.old_content,
        request.new_content,
        request.sudo,
    )
    return Response.success(
        data=result, message=f"替换{result.replace_count}处内容成功"
    )


@router.post(path="/search-in-file", response_model=Response[FileSearchResult])
async def search_in_file(
    request: FileSearchRequest, file_service: FileService = Depends(get_file_service)
):
    result = await file_service.search_in_file(
        request.filepath,
        request.regex,
    )
    return Response.success(data=result, message=f"搜索内容成功")


@router.post(path="/find-files", response_model=Response[FileFindResult])
async def find_files(
    request: FileFindRequest, file_service: FileService = Depends(get_file_service)
):
    result = await file_service.find_files(
        request.dir_path,
        request.glob,
    )
    return Response.success(data=result, message=f"搜索文件列表成功")


@router.post(path="/upload-file", response_model=Response[FileUploadResult])
async def upload_file(
    file: UploadFile = File(...),
    filepath: Optional[str] = Form(default=None),
    file_service: FileService = Depends(get_file_service),
):
    if not filepath:
        filepath = f"/tmp/{file.filename}"
    result = await file_service.upload_file(
        file,
        filepath,
    )
    return Response.success(data=result, message=f"上传文件成功")


@router.get(path="/download-file", response_class=FileResponse)
async def download_file(
    filepath: str,
    file_service: FileService = Depends(get_file_service),
) -> FileResponse:
    await file_service.ensure_file_exists(filepath)
    return FileResponse(
        filepath,
        filename=os.path.basename(filepath),
        media_type="application/octet-stream",
    )


@router.post(path="/check-file-exists", response_model=Response[FileExistsResult])
async def check_file_exists(
    request: FileExistsRequest,
    file_service: FileService = Depends(get_file_service),
) -> Response[FileExistsResult]:
    result = await file_service.check_file_exists(request.filepath)
    return Response.success(data=result)


@router.post(path="/delete-file", response_model=Response[FileDeleteResult])
async def delete_file(
    request: FileDeleteRequest,
    file_service: FileService = Depends(get_file_service),
) -> Response[FileDeleteResult]:
    result = await file_service.delete_file(request.filepath, request.sudo)
    return Response.success(data=result)
