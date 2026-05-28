from app.domain.repositories.uow import IUnitOfWork
from typing import Callable
import logging
from typing import BinaryIO
from typing import Tuple
from fastapi import UploadFile
from app.domain.external.file_storage import FileStorage
from app.domain.models.file import File

logger = logging.getLogger(__name__)


class FileService:
    def __init__(
        self, fileStorage: FileStorage, uow_factory: Callable[[...], IUnitOfWork]
    ):
        self.file_storage = fileStorage
        self.uow_factory = uow_factory
        self.uow: IUnitOfWork = uow_factory()

    async def upload_file(self, file: UploadFile) -> File:
        logger.info(f"上传文件: {file.filename}")
        result = await self.file_storage.upload_file(file)
        logger.info(f"文件上传成功: {result}")
        return result

    async def get_file_info(self, file_id: str) -> File:
        async with self.uow:
            file = await self.uow.file.get_file_by_id(file_id)

        if not file:
            raise ValueError(f"找不到此文件")

        return file

    async def download_file(self, file_id: str) -> Tuple[BinaryIO, File]:
        return await self.file_storage.download_file(file_id)
