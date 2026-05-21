from typing import Optional
from typing import Protocol
from app.domain.models.file import File


class FileRepository(Protocol):
    async def save(self, file: File) -> None:
        pass

    async def get_file_by_id(self, file_id: str) -> Optional[File]:
        pass
