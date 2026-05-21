from urllib.parse import quote
from fastapi.responses import StreamingResponse
from app.interface.dependencies import get_file_service
from app.application.services.file_service import FileService
from fastapi import UploadFile
from app.domain.models.file import File as FileInfo
from fastapi import Depends
from app.domain.models.app_config import LLM_Config
from app.interface.schemas import Response
import logging
from fastapi import File

logger = logging.getLogger(__name__)
from fastapi import APIRouter

router = APIRouter(prefix="/files", tags=["文件处理"])


@router.post(
    "/upload-file",
    response_model=Response[FileInfo],
    summary="上传文件",
    description=" 将文件上传到tos中",
)
async def upload_file(
    file: UploadFile = File(...),
    filer_service: FileService = Depends(get_file_service),
) -> Response[FileInfo]:
    result = await filer_service.upload_file(file)
    return Response(data=result)


@router.get(
    "/{file_id}",
    response_model=Response[FileInfo],
    summary="获取文件信息",
    description="获取文件的详细信息",
)
async def get_file_info(
    file_id: str,
    filer_service: FileService = Depends(get_file_service),
) -> Response[FileInfo]:
    result = await filer_service.get_file_info(file_id)
    return Response(data=result)


@router.get(
    "/{file_id}/download",
    summary="下载文件",
    description="下载文件到本地",
)
async def download_file(
    file_id: str,
    filer_service: FileService = Depends(get_file_service),
) -> StreamingResponse:
    file_data, file_info = await filer_service.download_file(file_id)
    encoded_filename = quote(file_info.filename)
    return StreamingResponse(
        file_data,
        media_type=file_info.mime_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "Content-Length": str(file_info.size),
        },
    )
