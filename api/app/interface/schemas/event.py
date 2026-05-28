from typing import get_args
from pydantic.dataclasses import dataclass
from typing import Union
from app.domain.models.event import ToolEvent
from app.domain.models.event import ToolEventStatus
from typing import Any
from app.domain.models.plan import ExecutionStatus
from app.domain.models.event import PlanEvent
from typing import Self
from typing import List
from app.domain.models.file import File
from typing import Literal
from typing import Type
from pydantic import ConfigDict
from pydantic import Field
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from typing import Dict
from app.domain.models.event import Event


class BaseEventData(BaseModel):
    event_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    model_config = ConfigDict(json_encoders={datetime: lambda v: int(v.timestamp())})

    @classmethod
    def base_event_data(cls, event: Event) -> Dict:
        return cls(
            event_id=event.id,
            created_at=int(event.created_at.timestamp()),
        )

    @classmethod
    def from_event(cls, event: Event) -> Dict:
        return cls(
            **cls.base_event_data(event),
            **event.model_dump(mode="json", exclude={"id", "created_at"}),
        )


class BaseSSEEvent(BaseModel):
    event: str
    data: BaseEventData

    @classmethod
    def from_event(cls, event: Event) -> Dict:  # 将事件Domain模型转换为基础流式事件
        data_cls: Type[BaseEventData] = cls.__annotations.get("data", BaseEventData)
        return cls(
            event=event.type,
            data=data_cls.from_event(event),
        )


class CommonEventData(BaseEventData):
    model_config = ConfigDict(
        json_encoders={datetime: lambda v: int(v.timestamp())}, extra="allow"
    )


class CommonSSEEvent(BaseSSEEvent):
    event: str
    data: CommonEventData


class MessageEventData(BaseEventData):
    role: Literal["user", "assistant"] = "assistant"
    message: str = ""
    attachments: List[File] = []


class MessageSSEEvent(BaseSSEEvent):
    event: Literal["message"] = "message"
    data: MessageEventData

    @classmethod
    def from_event(cls, event: Event) -> Self:  # 将事件Domain模型转换为基础流式事件
        return cls(
            event=event.type,
            data=MessageEventData(
                **BaseEventData.base_event_data(event),
                role=event.role,
                message=event.message,
                attachments=event.attachments,
            ),
        )


class TitleEventData(BaseEventData):
    title: str = ""


class TitleSSEEvent(BaseSSEEvent):
    event: Literal["title"] = "title"
    data: TitleEventData


class StepEventData(BaseEventData):
    id: str
    status: ExecutionStatus
    description: str


class StepSSEEvent(BaseSSEEvent):
    event: Literal["step"] = "step"
    data: StepEventData

    @classmethod
    def from_event(cls, event: Event) -> Self:  # 将事件Domain模型转换为基础流式事件
        return cls(
            event=event.type,
            data=StepEventData(
                **BaseEventData.base_event_data(event),
                id=event.step.id,
                status=event.step.status,
                description=event.step.description,
            ),
        )


class PlanEventData(BaseEventData):
    steps: List[StepEventData]


class PlanSSEEvent(BaseSSEEvent):
    event: Literal["plan"] = "plan"
    data: PlanEventData

    @classmethod
    def from_event(cls, event: PlanEvent) -> Self:  # 将事件Domain模型转换为基础流式事件
        return cls(
            event=event.type,
            data=PlanEventData(
                **BaseEventData.base_event_data(event),
                steps=[
                    StepEventData(
                        **BaseEventData.base_event_data(event),
                        id=step.id,
                        status=step.status,
                        description=step.description,
                    )
                    for step in event.plan.steps
                ],
            ),
        )


class ToolEventData(BaseEventData):
    tool_call_id: str = ""  # 工具调用ID
    tool_name: str = ""  # 工具集的名称
    function_name: str = ""  # 工具函数名
    function_args: Dict[str, Any] = Field(default_factory=dict)  # 工具函数参数
    function_result: Optional[Any] = None  # 工具函数执行结果
    status: ToolEventStatus = ToolEventStatus.CALLING  # 工具事件状态


class ToolSSEEvent(BaseSSEEvent):
    event: Literal["tool"] = "tool"
    data: ToolEventData

    @classmethod
    def from_event(cls, event: ToolEvent) -> Self:  # 将事件Domain模型转换为基础流式事件
        return cls(
            event=event.type,
            data=ToolEventData(
                **BaseEventData.base_event_data(event),
                tool_call_id=event.tool_call_id,
                tool_name=event.tool_name,
                function_name=event.function_name,
                function_args=event.function_args,
                function_result=event.tool_content,
                status=event.status,
            ),
        )


class DoneSSEEvent(BaseSSEEvent):
    event: Literal["done"] = "done"


class WaitSSEEvent(BaseSSEEvent):
    event: Literal["wait"] = "wait"


class ErrorEventData(BaseEventData):
    error: str = ""


class ErrorSSEEvent(BaseSSEEvent):
    event: Literal["error"] = "error"
    data: ErrorEventData


AgentSSEEvent = Union[
    CommonSSEEvent,
    MessageSSEEvent,
    TitleSSEEvent,
    StepSSEEvent,
    PlanSSEEvent,
    ToolSSEEvent,
    WaitSSEEvent,
    ErrorSSEEvent,
    DoneSSEEvent,
]


@dataclass
class EventMapping:
    """事件映射数据类，用于存储事件映射信息，涵盖流式事件类型，数据类，事件类型字符串"""

    sse_event_class: Type[BaseSSEEvent]
    data_class: Type[BaseEventData]
    event_type: str


class EventMapper:
    """事件映射类，利用Python自身提供的自省机制，将业务逻辑中的Event转换成适合流式输出的AgentSSEEvent"""

    # 缓存隐射
    _cache_mapping: Optional[Dict[str, EventMapping]] = None

    @staticmethod
    def get_event_type_mapping() -> Dict[str, EventMapping]:

        if EventMapper._cache_mapping is not None:
            return EventMapper._cache_mapping

        sse_event_classes = get_args(AgentSSEEvent)
        mapping = {}

        for sse_event_class in sse_event_classes:
            if sse_event_class == BaseSSEEvent:
                continue

            if (
                hasattr(sse_event_class, "__annotations__")
                and "event" in sse_event_class.__annotations__
            ):
                event_field = sse_event_class.__annotations__["event"]

                if hasattr(event_field, "__args__") and len(event_field.__args__) > 0:
                    event_type = event_field.__args__[0]
                    data_class = None
                    if (
                        hasattr(sse_event_class, "__annotations__")
                        and "data" in sse_event_class.__annotations__
                    ):
                        data_class = sse_event_class.__annotations__["data"]
                    mapping[event_type] = EventMapping(
                        sse_event_class=sse_event_class,
                        data_class=data_class,
                        event_type=event_type,
                    )

        EventMapper._cache_mapping = mapping
        return mapping

    @staticmethod
    def event_to_sse_event(event: Event) -> AgentSSEEvent:
        """将事件Domain模型转换为Agent流式事件"""
        event_type_mapping = EventMapper.get_event_type_mapping()
        event_mapping = event_type_mapping.get(event.type)

        if event_mapping:
            sse_event = event_mapping.sse_event_class.from_event(event)
            return sse_event

        return CommonSSEEvent.from_event(event)

    @staticmethod
    def events_to_sse_events(events: List[Event]) -> List[AgentSSEEvent]:
        """将事件Domain模型转换为Agent流式事件"""
        sse_events = []
        for event in events:
            sse_events.append(EventMapper.event_to_sse_event(event))
        return sse_events
