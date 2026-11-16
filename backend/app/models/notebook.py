from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class SubjectNotebook(Base, TimestampMixin):
    __tablename__ = "subject_notebooks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    subject_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    instructor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), default="navy", nullable=True)  # navy, emerald, crimson, etc.
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    target_exam_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    units_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of strings
    progress_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_studied_at: Mapped[str | None] = mapped_column(String(100), nullable=True)

    pages: Mapped[list["NotebookPage"]] = relationship(back_populates="notebook", cascade="all, delete-orphan", order_by="NotebookPage.page_order")
    sticky_notes: Mapped[list["NotebookStickyNote"]] = relationship(back_populates="notebook", cascade="all, delete-orphan")


class NotebookPage(Base, TimestampMixin):
    __tablename__ = "notebook_pages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    notebook_id: Mapped[str] = mapped_column(String(36), ForeignKey("subject_notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_or_chapter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Cornell note sections
    cue_column: Mapped[str | None] = mapped_column(Text, nullable=True)
    cue_points_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of points
    notes_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of tag strings
    # Generic rich content (JSON string)
    content_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    notebook: Mapped["SubjectNotebook"] = relationship(back_populates="pages")


class NotebookStickyNote(Base, TimestampMixin):
    __tablename__ = "notebook_sticky_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    notebook_id: Mapped[str] = mapped_column(String(36), ForeignKey("subject_notebooks.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    color: Mapped[str | None] = mapped_column(String(50), default="yellow", nullable=True)  # yellow, pink, cyan, lime, lavender
    position_x: Mapped[float | None] = mapped_column(Float, nullable=True)
    position_y: Mapped[float | None] = mapped_column(Float, nullable=True)

    notebook: Mapped["SubjectNotebook"] = relationship(back_populates="sticky_notes")
