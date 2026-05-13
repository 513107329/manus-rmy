from typing import Optional
from pydantic import BaseModel, Field


class ReadFileRequest(BaseModel):
    filepath: str = Field(..., description="文件路径")
    start_line: Optional[int] = Field(default=None, description="开始行")
    end_line: Optional[int] = Field(default=None, description="结束行")
    sudo: Optional[bool] = Field(default=False, description="是否使用sudo")


class WriteFileRequest(BaseModel):
    filepath: str = Field(..., description="文件路径")
    content: str = Field(..., description="文件内容")
    append: bool = Field(default=False, description="是否追加")
    leading_newline: bool = Field(default=False, description="是否添加前导换行符")
    trailing_newline: bool = Field(default=False, description="是否添加尾随换行符")
    sudo: Optional[bool] = Field(default=False, description="是否使用sudo")


class FileReplaceRequest(BaseModel):
    filepath: str = Field(..., description="文件路径")
    old_content: str = Field(..., description="旧内容")
    new_content: str = Field(..., description="新内容")
    sudo: Optional[bool] = Field(default=False, description="是否使用sudo")


class FileSearchRequest(BaseModel):
    filepath: str = Field(..., description="文件路径")
    regex: str = Field(..., description="正则表达式")


class FileFindRequest(BaseModel):
    dir_path: str = Field(..., description="目录路径")
    glob: str = Field(..., description="glob表达式")


class FileUploadRequest(BaseModel):
    dir_path: str = Field(..., description="目录路径")
    glob: str = Field(..., description="glob表达式")


class FileExistsRequest(BaseModel):
    filepath: str = Field(..., description="文件路径")


class FileDeleteRequest(BaseModel):
    filepath: str = Field(..., description="文件路径")
    sudo: Optional[bool] = Field(default=False, description="是否使用sudo")
