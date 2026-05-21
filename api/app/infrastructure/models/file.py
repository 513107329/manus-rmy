from datetime import datetime
import uuid
from sqlalchemy import String, text, DateTime, Integer, PrimaryKeyConstraint
from sqlalchemy.orm import mapped_column, Mapped
from app.infrastructure.models import Base
from app.domain.models.file import File


class FileModel(Base):
    __tablename__ = "files"
    __table_args__ = (PrimaryKeyConstraint("id", name="pk_files_id"),)

    id: Mapped[str] = mapped_column(
        String(255), nullable=False, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    filename: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("''::character varying")
    )
    filepath: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("''::character varying")
    )
    key: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("''::character varying")
    )
    extension: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("''::character varying")
    )
    mime_type: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=text("''::character varying")
    )
    size: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
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
    def from_domain(cls, file: File) -> "FileModel":
        return cls(**file.model_dump(mode="json"))

    def to_domain(self) -> File:
        return File.model_validate(self, from_attributes=True)

    def update_from_domain(self, file: File) -> None:
        base_data = file.model_dump(mode="json")
        for field, value in {**base_data}.items():
            setattr(self, field, value)
