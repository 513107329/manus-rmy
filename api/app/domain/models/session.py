from app.domain.models.event import PlanEvent
from enum import Enum
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
    RUNNING = "running"
    WAITING = "waiting"
    COMPLETED = "completed"


class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sandbox_id: Optional[str] = Field(default=None)
    task_id: Optional[str] = Field(default=None)
    title: Optional[str] = Field(default=None)
    unread_msg_count: int = Field(default=0)
    latest_msg: Optional[str] = Field(default=None)
    latest_message_at: Optional[datetime] = Field(default_factory=datetime.now)
    events: List[Event] = Field(default_factory=list)
    files: List[File] = Field(default_factory=list)
    memories: Dict[str, Memory] = Field(default_factory=dict)
    status: SessionStatus = Field(default=SessionStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    def get_latest_plan(self) -> Optional[Plan]:
        for event in reversed(self.events):
            if isinstance(event, PlanEvent):
                return event.plan

        return None
