from app.domain.models.tool_result import ToolResult
from typing import Dict
from typing import Optional
from app.domain.models.file import File
from typing import Union
from typing import List
from typing import Any
from enum import Enum
from datetime import datetime
from typing import Literal
import uuid
from pydantic import Field
from pydantic import BaseModel
from app.domain.models.plan import Plan, Step


class PlanEventStatus(str, Enum):
    """规划事件状态"""

    CREATED = "created"  # 规划创建
    UPDATED = "updated"  # 规划更新
    DELETED = "deleted"  # 规划删除


class StepEventStatus(str, Enum):
    """子任务/步骤事件状态"""

    STARTED = "started"  # 子任务/步骤开始执行
    COMPLETED = "completed"  # 子任务/步骤完成执行
    FAILED = "failed"  # 子任务/步骤失败


class BaseEvent(BaseModel):
    """基础事件类型"""

    id: str = Field(default_factory=lambda: str(uuid.uuidv4()))
    type: Literal[""] = ""  # 事件类型
    created_at: datetime = Field(default_factory=datetime.now)  # 事件创建时间


class PlanEvent(BaseEvent):
    """规划事件类型"""

    type: Literal["plan"] = "plan"  # 事件类型
    plan: Plan  # 规划
    status: PlanEventStatus = PlanEventStatus.CREATED  # 事件状态


class TitleEvent(BaseEvent):
    """标题事件类型"""

    type: Literal["title"] = "title"  # 事件类型
    title: str = ""  # 标题


class StepEvent(BaseEvent):
    """子任务/步骤事件类型"""

    type: Literal["step"] = "step"  # 事件类型
    step: Step  # 子任务
    status: StepEventStatus = StepEventStatus.STARTED  # 事件状态


class MessageEvent(BaseEvent):
    """消息事件，包含人类信息和AI信息"""

    type: Literal["message"] = "message"  # 事件类型
    role: Literal["user", "assistant"] = "assistant"
    message: str = ""  # 消息
    attachments: List[File] = Field(default_factory=list)  # 附件列表


class BrowserToolContent(BaseModel):
    """浏览器工具内容"""

    screenshot: str = ""  # 浏览器快照
    url: str = ""  # 浏览器URL


class MCPToolContent(BaseModel):
    """MCP工具内容"""

    result: Any


ToolContent = Union[BrowserToolContent, MCPToolContent]


class ToolEventStatus(str, Enum):
    """工具事件状态"""

    CALLING = "calling"  # 工具调用中
    CALLED = "called"  # 工具调用完成


class ToolEvent(BaseEvent):
    """工具事件"""

    type: Literal["tool"] = "tool"  # 事件类型
    tool_call_id: str = ""  # 工具调用ID
    tool_name: str = ""  # 工具集的名称
    tool_content: Optional[ToolContent] = None  # 工具扩展内容
    function_name: str = ""  # 工具函数名
    function_args: Dict[str, Any] = Field(default_factory=dict)  # 工具函数参数
    function_result: Optional[ToolResult] = None  # 工具函数执行结果
    status: ToolEventStatus = ToolEventStatus.CALLING  # 工具事件状态


class WaitEvent(BaseEvent):
    """等待事件， 等待用户输入确认"""

    type: Literal["wait"] = "wait"  # 事件类型


class ErrorEvent(BaseEvent):
    """错误事件类型"""

    type: Literal["error"] = "error"  # 事件类型
    error: str = ""  # 错误信息


class DoneEvent(BaseEvent):
    """结束事件类型"""

    type: Literal["done"] = "done"  # 事件类型


Event = Union[
    PlanEvent,
    TitleEvent,
    StepEvent,
    MessageEvent,
    ToolEvent,
    WaitEvent,
    ErrorEvent,
    DoneEvent,
]
