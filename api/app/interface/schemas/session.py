from pydantic import Field
from typing import Optional
from app.domain.models.session import SessionStatus
from datetime import datetime
from typing import List
from pydantic import BaseModel


class CreateSessionResponse(BaseModel):
    session_id: str


class ListSessionItem(BaseModel):
    id: str
    title: str
    unread_msg_count: int
    latest_msg: Optional[str] = Field(default=None)
    latest_message_at: Optional[datetime] = Field(default_factory=datetime.now)
    status: SessionStatus


class ListSessionResponse(BaseModel):
    sessions: List[ListSessionItem]


class ChatRequest(BaseModel):
    message: Optional[str] = Field(default=None)
    attachments: Optional[List[str]] = Field(
        default_factory=list
    )  # 附件列表(传的是列表id)
    event_id: Optional[str] = Field(default=None)  # 最新事件id
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
