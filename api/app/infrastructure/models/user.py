from sqlalchemy.orm import mapped_column, Mapped
from .base import Base
from sqlalchemy import text, String, DateTime, PrimaryKeyConstraint, UUID
from datetime import datetime
import uuid


class User(Base):
    __tablename__ = "users"
    __table_args__ = (PrimaryKeyConstraint("id", name="pk_user_id"),)
    id: Mapped[uuid.UUID] = mapped_column(
        UUID, primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    email: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    password: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=""
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, default=text("CURRENT_TIMESTAMP(0)")
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, default=text("CURRENT_TIMESTAMP(0)"), onupdate=datetime.now
    )
