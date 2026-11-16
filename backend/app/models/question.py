from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class ImportantQuestion(Base, TimestampMixin):
    __tablename__ = "important_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("course_modules.id", ondelete="SET NULL"), nullable=True, index=True)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)  # easy | medium | hard
    importance_rating: Mapped[str] = mapped_column(String(20), default="High", nullable=False)  # Very High | High | Medium
    frequency_score: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    blooms_taxonomy: Mapped[str] = mapped_column(String(30), default="Understand", nullable=False)  # Remember | Understand | Apply | Analyze | Evaluate
    priority_score: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    source: Mapped[str] = mapped_column(String(30), default="ai", nullable=False)  # ai | teacher
    marks: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    expected_key_points_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of strings
    model_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_label: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_resource_ids: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of IDs

    course: Mapped["Course"] = relationship()
    module: Mapped["CourseModule | None"] = relationship()
    bookmarks: Mapped[list["StudentQuestionBookmark"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class StudentQuestionBookmark(Base, TimestampMixin):
    __tablename__ = "student_question_bookmarks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("important_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    question: Mapped["ImportantQuestion"] = relationship(back_populates="bookmarks")
