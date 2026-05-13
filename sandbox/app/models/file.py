from typing import List
from pydantic import Field
from pydantic import BaseModel


class FileReadResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    content: str = Field(..., description="文件内容")


class FileWriteResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    bytes_written: int = Field(..., description="写入的字节数")


class FileReplaceResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    replace_count: int = Field(..., description="替换内容的次数")


class FileSearchResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    matches: List[str] = Field(default_factory=list, description="匹配的内容列表")
    line_numbers: List[int] = Field(default_factory=list, description="匹配的行号列表")


class FileFindResult(BaseModel):
    dir_path: str = Field(..., description="目录路径")
    file_list: List[str] = Field(default_factory=list, description="文件列表")


class FileUploadResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    file_size: int = Field(..., description="文件大小")
    success: bool = Field(..., description="是否成功")


class FileExistsResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    exists: bool = Field(..., description="文件是否存在")


class FileDeleteResult(BaseModel):
    filepath: str = Field(..., description="文件路径")
    success: bool = Field(..., description="是否成功")
