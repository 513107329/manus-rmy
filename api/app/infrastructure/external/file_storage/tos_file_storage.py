from typing import Callable
from app.domain.repositories.uow import IUnitOfWork
from typing import BinaryIO
from typing import Tuple
from fastapi.concurrency import run_in_threadpool
from datetime import datetime
import uuid
from fastapi import UploadFile
from app.infrastructure.storage.tos import Tos
import logging
import os
from app.domain.external.file_storage import FileStorage
from app.domain.models.file import File

logger = logging.getLogger(__name__)


class TosFileStorage(FileStorage):
    def __init__(
        self, bucket: str, tos: Tos, uow_factory: Callable[[], IUnitOfWork]
    ) -> None:
        self.bucket = bucket
        self.tos = tos
        self.uow_factory = uow_factory
        self.uow: IUnitOfWork = uow_factory()

    async def upload_file(self, uploadFile: UploadFile) -> File:
        try:
            file_id = str(uuid.uuid4())
            _, file_extension = os.path.splitext(uploadFile.filename)
            if not file_extension:
                file_extension = ""
            date_path = datetime.now().strftime("%Y/%m/%d")
            tos_key = f"{date_path}/{file_id}{file_extension}"

            await run_in_threadpool(
                self.tos._client.put_object,
                bucket=self.bucket,
                content=uploadFile.file,
                key=tos_key,
            )
            logger.info("文件上传成功")

            file = File(
                id=file_id,
                filename=uploadFile.filename,
                key=tos_key,
                extension=file_extension,
                mime_type=uploadFile.content_type or "",
                size=uploadFile.size,
            )
            async with self.uow:
                await self.uow.file.save(file)

            return file
        except Exception as e:
            logger.error(f"上传文件失败: {e}")
            raise ValueError("上传失败")

    async def download_file(self, file_id: str) -> Tuple[BinaryIO, File]:
        try:
            async with self.uow:
                file = await self.uow.file.get_file_by_id(file_id)
                if not file:
                    raise ValueError(f"该文件不存在")

            response = await run_in_threadpool(
                self.tos._client.get_object,
                bucket=self.bucket,
                key=file.key,
            )

            return response.content, file
        except Exception as e:
            logger.error(f"下载文件失败")
            raise ValueError("下载失败")
