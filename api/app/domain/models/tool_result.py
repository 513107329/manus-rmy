from typing import Generic, Optional, TypeVar
from pydantic import BaseModel


T = TypeVar("T")


class ToolResult(BaseModel, Generic[T]):
    """工具结果Domain模型"""

    success: bool = True
    data: Optional[T] = None  # 工具执行结果/数据
    message: Optional[str] = None  # 额外信息提示

    @classmethod
    def from_sandbox(
        cls, code: int, message: str, data: Optional[T], **kwargs
    ) -> "ToolResult":
        return cls(success=True if code < 300 else False, message=message, data=data)
