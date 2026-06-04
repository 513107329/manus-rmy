from app.interface.schemas.event import AgentSSEEvent
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
    timestamp: Optional[int] = 0  # 时间戳(毫秒)


class GetSessionResponse(BaseModel):
    session_id: str
    title: str
    events: List[AgentSSEEvent] = Field(default_factory=list)
    status: SessionStatus


class GetSessionFilesResponse(BaseModel):
    session_id: str
    files: List[str] = Field(default_factory=list)


class FileReadRequest(BaseModel):
    filepath: str


class FileReadResponse(BaseModel):
    filepath: str
    content: str


class ShellReadRequest(BaseModel):
    session_id: str


class ConsoleRecord(BaseModel):
    ps1: str
    command: str
    output: str


class ShellReadResponse(BaseModel):
    session_id: str
    output: str
    console_records: List[ConsoleRecord]
