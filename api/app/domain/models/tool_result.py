from typing import Generic, Optional, TypeVar
from pydantic import BaseModel


T = TypeVar("T")


class ToolResult(BaseModel, Generic[T]):
    """工具结果Domain模型"""

    success: bool = True
    data: Optional[T] = None  # 工具执行结果/数据
    message: Optional[str] = None  # 额外信息提示
