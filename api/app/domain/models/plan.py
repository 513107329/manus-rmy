from typing import Optional
from typing import List
from typing import Any
import uuid
from pydantic import Field
from pydantic import BaseModel
from enum import Enum


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Step(BaseModel):
    """计划中的每一个步骤/子任务"""

    id: str = Field(default_factory=lambda: str(uuid.uuidv4()))
    description: str = ""  # 子任务描述信息
    status: ExecutionStatus = ExecutionStatus.PENDING
    result: Optional[str] = None  # 结果
    error: Optional[str] = None  # 错误信息
    success: bool = False  # 是否执行成功
    attachments: Optional[List[str]] = None  # 附件列表


class Plan(BaseModel):
    """规划Domain模型，存储用户传递消息拆分出来的子任务、子步骤"""

    id: str = Field(default_factory=lambda: str(uuid.uuidv4()))
    title: str = ""
    goal: str = ""
    language: str = ""
    message: str = ""
    status: ExecutionStatus = ExecutionStatus.PENDING
    error: Optional[str] = None
    steps: List[Any] = Field(default_factory=list)
    result: Optional[str] = None  # 最终结果

    @property
    def done(self) -> bool:
        return self.status in [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED]

    def get_next_step(self) -> Optional[Step]:
        """获取下一个未执行的步骤"""
        return next((step for step in self.steps if not step.done), None)
