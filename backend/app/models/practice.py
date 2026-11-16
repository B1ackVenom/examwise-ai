from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class PracticePaper(Base, TimestampMixin):
    __tablename__ = "practice_papers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_marks: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=180, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)  # easy | medium | hard
    status: Mapped[str] = mapped_column(String(20), default="available", nullable=False)  # available | in_progress | submitted
    source: Mapped[str] = mapped_column(String(20), default="ai", nullable=False)  # ai | custom
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    course: Mapped["Course"] = relationship()
    questions: Mapped[list["PracticeQuestion"]] = relationship(
        back_populates="paper",
        cascade="all, delete-orphan",
        order_by="PracticeQuestion.question_number",
    )
    attempts: Mapped[list["PracticeAttempt"]] = relationship(
        back_populates="paper",
        cascade="all, delete-orphan",
        order_by="PracticeAttempt.created_at.desc()",
    )


class PracticeQuestion(Base, TimestampMixin):
    __tablename__ = "practice_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("practice_papers.id", ondelete="CASCADE"), nullable=False, index=True)
    question_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(30), default="mcq", nullable=False)  # mcq | short_answer
    marks: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    options_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array of string choices for MCQ
    correct_answer: Mapped[str] = mapped_column(Text, default="", nullable=False)
    explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium", nullable=False)

    paper: Mapped["PracticePaper"] = relationship(back_populates="questions")


class PracticeAttempt(Base, TimestampMixin):
    __tablename__ = "practice_attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("practice_papers.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    answers_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON dict {q_id: answer}
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_marks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    topic_breakdown_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON list of breakdown dicts
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="submitted", nullable=False)

    paper: Mapped["PracticePaper"] = relationship(back_populates="attempts")
    student: Mapped["User"] = relationship()
