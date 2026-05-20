from app.domain.models.event import PlanEvent
from sqlalchemy.types import Enum
from app.domain.models.plan import Plan
from datetime import datetime
from app.domain.models.memory import Memory
from typing import Dict
from app.domain.models.file import File
from app.domain.models.event import Event
from typing import List
from typing import Optional
import uuid
from pydantic import Field
from pydantic import BaseModel


class SessionStatus(str, Enum):
    PENDING = "pending"
    INACTIVE = "inactive"


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sandbox_id: Optional[str] = Field(default=None)
    task_id: Optional[str] = Field(default=None)
    title: str = Field(default="")
    unread_msg_count: int = Field(default=0)
    latest_msg: str = Field(default="")
    latest_message_at: int = Field(default=0)
    events: List[Event] = Field(default_factory=list)
    files: List[File] = Field(default_factory=list)
    memories: Dict[str, Memory] = Field(default_factory=dict)
    status: SessionStatus = Field(default=SessionStatus.PENDING)
    created_at: int = Field(default_factory=datetime.now().timestamp)
    updated_at: int = Field(default_factory=datetime.now().timestamp)

    def get_latest_plan(self) -> Optional[Plan]:
        for event in reversed(self.events):
            if isinstance(event, PlanEvent):
                return event.plan

        return None
