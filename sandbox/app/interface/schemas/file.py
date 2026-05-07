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
