import logging
from typing import BinaryIO
from typing import Tuple
from fastapi import UploadFile
from app.domain.repositories.file_repository import FileRepository
from app.domain.external.file_storage import FileStorage
from app.domain.models.file import File

logger = logging.getLogger(__name__)


class FileService:
    def __init__(self, fileStorage: FileStorage, file_repository: FileRepository):
        self.file_storage = fileStorage
        self.file_repository = file_repository

    async def upload_file(self, file: UploadFile) -> File:
        logger
        result = await self.file_storage.upload_file(file)
        return result

    async def get_file_info(self, file_id: str) -> File:
        file = await self.file_repository.get_file_by_id(file_id)

        if not file:
            raise ValueError(f"找不到此文件")

        return file

    async def download_file(self, file_id: str) -> Tuple[BinaryIO, File]:
        return await self.file_storage.download_file(file_id)
