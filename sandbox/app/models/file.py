from pydantic import Field
from pydantic import BaseModel


class FileReadResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    content: str = Field(..., description="文件内容")


class FileWriteResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    bytes_written: int = Field(..., description="写入的字节数")
