from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# ── Rubric Criteria ──────────────────────────────────────────────────────────

class RubricCriteriaCreate(BaseModel):
    criterion: str = Field(min_length=1)
    max_marks: int = Field(ge=1)
    description: str | None = None
    order_index: int = 0


class RubricCriteriaResponse(BaseModel):
    id: str
    exam_question_id: str
    criterion: str
    max_marks: int
    description: str | None = None
    order_index: int = 0

    model_config = {"from_attributes": True}


# ── Exam Questions ───────────────────────────────────────────────────────────

class ExamQuestionCreate(BaseModel):
    question_text: str = Field(min_length=1)
    question_type: str = Field(default="descriptive")  # descriptive | short | long | mcq
    marks: int = Field(default=5, ge=1)
    expected_answer: str | None = None
    options: list[str] | None = None
    topic: str | None = None
    difficulty: str = Field(default="medium")  # easy | medium | hard
    order_index: int = 0
    rubric_criteria: list[RubricCriteriaCreate] = Field(default_factory=list)


class ExamQuestionUpdate(BaseModel):
    question_text: str | None = None
    question_type: str | None = None
    marks: int | None = None
    expected_answer: str | None = None
    options: list[str] | None = None
    topic: str | None = None
    difficulty: str | None = None
    order_index: int | None = None


class ExamQuestionResponse(BaseModel):
    id: str
    exam_id: str
    question_text: str
    question_type: str = "descriptive"
    marks: int = 5
    expected_answer: str | None = None
    options: list[str] | None = None
    topic: str | None = None
    difficulty: str = "medium"
    order_index: int = 0
    rubric_criteria: list[RubricCriteriaResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


# ── Exams ────────────────────────────────────────────────────────────────────

class ExamCreate(BaseModel):
    course_id: str
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    exam_type: str = Field(default="written")  # written | mid_term | end_term | mcq | mixed
    total_marks: int = Field(default=50, ge=1, le=500)
    duration_minutes: int = Field(default=120, ge=10, le=360)
    scheduled_at: datetime | None = None
    questions: list[ExamQuestionCreate] = Field(default_factory=list)


class ExamUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    exam_type: str | None = None
    total_marks: int | None = Field(default=None, ge=1)
    duration_minutes: int | None = Field(default=None, ge=10)
    scheduled_at: datetime | None = None
    status: str | None = None  # draft | published | ongoing | completed | cancelled


class ExamResponse(BaseModel):
    id: str
    course_id: str
    teacher_id: str
    title: str
    description: str | None = None
    exam_type: str = "written"
    total_marks: int = 50
    duration_minutes: int = 120
    scheduled_at: str | None = None
    status: str = "draft"
    question_count: int = 0
    submission_count: int = 0
    questions: list[ExamQuestionResponse] = Field(default_factory=list)
    created_at: str = ""

    model_config = {"from_attributes": True}


# ── Submissions & Evaluations ────────────────────────────────────────────────

class QuestionAnswerItem(BaseModel):
    exam_question_id: str
    answer_text: str = ""


class SubmissionCreate(BaseModel):
    answers: list[QuestionAnswerItem] = Field(default_factory=list)


class QuestionEvaluationResponse(BaseModel):
    id: str
    submission_id: str
    exam_question_id: str
    question_text: str = ""
    max_marks: int = 5
    student_answer: str = ""
    # AI proposed marks
    ai_proposed_marks: float | None = None
    ai_explanation: str | None = None
    ai_evidence: str | None = None
    ai_provider_used: str | None = None
    # Teacher final marks
    teacher_marks: float | None = None
    teacher_comment: str | None = None
    teacher_id: str | None = None
    is_approved: bool = False
    approved_at: str | None = None

    model_config = {"from_attributes": True}


class SubmissionResponse(BaseModel):
    id: str
    exam_id: str
    exam_title: str = ""
    student_id: str
    student_name: str = ""
    student_email: str = ""
    status: str = "submitted"  # pending | submitted | under_review | evaluated | published
    submitted_at: str | None = None
    total_score: float | None = None
    max_marks: int = 0
    is_fully_evaluated: bool = False
    evaluations: list[QuestionEvaluationResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class TeacherReviewEvaluationRequest(BaseModel):
    marks: float = Field(ge=0.0)
    comment: str | None = None
    approve: bool = True
