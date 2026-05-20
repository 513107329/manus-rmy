from sqlalchemy.dialects.postgresql import JSONB
from typing import Dict, Any, List
from sqlalchemy import DateTime, Text, Integer, String, PrimaryKeyConstraint, text
import uuid
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from app.infrastructure.models import Base
from app.domain.models.session import Session


class SessionModel(Base):
    __tablename__ = "sessions"
    __table_args__ = (PrimaryKeyConstraint("id", name="pk_sessions_id"),)
    id: Mapped[str] = mapped_column(
        String(255), nullable=False, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    sandbox_id: Mapped[str] = mapped_column(String(255), nullable=True)  # 沙箱id
    task_id: Mapped[str] = mapped_column(String(255), nullable=True)  # 任务id
    title: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("''::character varying")
    )  # 任务标题
    unread_msg_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )  # 未读消息数
    latest_msg: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=text("''::text")
    )  # 最后一条消息
    latest_message_at: Mapped[int] = mapped_column(
        DateTime, nullable=True
    )  # 最后一条消息时间
    events: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    files: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    memories: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    status: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("''::character varying")
    )
    created_at: Mapped[int] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP(0)"),
    )  # 创建时间
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime,
        nullable=False,
        onupdate=datetime.now,
        server_default=text("CURRENT_TIMESTAMP(0)"),
    )  # 更新时间

    @classmethod
    def from_domain(cls, session: Session) -> "SessionModel":
        return cls(
            **session.model_dump(
                mode="python",
                exclude={"memories", "files", "events", "created_at", "updated_at"},
            ),
            **session.model_dump(
                mode="json",
                include={"memories", "files", "events"},
            ),
        )

    def to_domain(self) -> Session:
        return Session.model_validate(self, from_attributes=True)

    def update_from_domain(self, session: Session) -> None:
        base_data = session.model_dump(
            mode="python",
            exclude={"memories", "files", "events", "created_at", "updated_at"},
        )
        json_data = session.model_dump(
            mode="json",
            include={"memories", "files", "events"},
        )
        for field, value in {
            **base_data,
            **json_data,
        }.items():
            setattr(self, field, value)
