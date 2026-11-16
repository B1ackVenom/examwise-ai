from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class Submission(Base, TimestampMixin):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    exam_id: Mapped[str] = mapped_column(String(36), ForeignKey("exams.id", ondelete="RESTRICT"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    # Digital text submission
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    # OCR fields — deferred, kept nullable for future compatibility
    ocr_extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    avg_ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)  # pending | submitted | under_review | evaluated | published
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)

    exam: Mapped["Exam"] = relationship(back_populates="submissions")
    evaluations: Mapped[list["QuestionEvaluation"]] = relationship(back_populates="submission", cascade="all, delete-orphan")


class QuestionEvaluation(Base, TimestampMixin):
    __tablename__ = "question_evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    submission_id: Mapped[str] = mapped_column(String(36), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_question_id: Mapped[str] = mapped_column(String(36), ForeignKey("exam_questions.id", ondelete="RESTRICT"), nullable=False, index=True)
    # AI proposed marks (never final until teacher approves)
    ai_proposed_marks: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_provider_used: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Teacher final marks
    teacher_marks: Mapped[float | None] = mapped_column(Float, nullable=True)
    teacher_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    teacher_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    submission: Mapped["Submission"] = relationship(back_populates="evaluations")
