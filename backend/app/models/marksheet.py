from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class MarksheetBatch(Base, TimestampMixin):
    __tablename__ = "marksheet_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    exam_id: Mapped[str] = mapped_column(String(36), ForeignKey("exams.id", ondelete="RESTRICT"), nullable=False, index=True)
    teacher_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    batch_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending | verified | rejected
    record_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    records: Mapped[list["MarksheetRecord"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class MarksheetRecord(Base, TimestampMixin):
    __tablename__ = "marksheet_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    batch_id: Mapped[str] = mapped_column(String(36), ForeignKey("marksheet_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    total_marks: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_marks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    grade: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Detailed breakdown as JSON
    breakdown_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    batch: Mapped["MarksheetBatch"] = relationship(back_populates="records")


class PublishedResult(Base, TimestampMixin):
    __tablename__ = "published_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    exam_id: Mapped[str] = mapped_column(String(36), ForeignKey("exams.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    total_marks: Mapped[float] = mapped_column(Float, nullable=False)
    max_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    grade: Mapped[str | None] = mapped_column(String(10), nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    published_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    breakdown_json: Mapped[str | None] = mapped_column(Text, nullable=True)
