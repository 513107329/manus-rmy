from typing import Tuple
from fastapi import UploadFile
from typing import BinaryIO
from typing import Protocol
from app.domain.models.file import File


class FileStorage(Protocol):
    async def upload_file(self, uploadFile: UploadFile) -> File: ...

    async def download_file(self) -> Tuple[BinaryIO, File]: ...
