from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PracticeQuestionCreate(BaseModel):
    question_number: int = Field(default=1, ge=1)
    question_text: str = Field(min_length=1)
    question_type: str = Field(default="mcq")  # mcq | short_answer
    marks: int = Field(default=1, ge=1)
    options: list[str] | None = None
    correct_answer: str = ""
    explanation: str = ""
    topic: str | None = None
    difficulty: str = "medium"


class PracticeQuestionResponse(BaseModel):
    id: str
    paperId: str
    questionNumber: int
    questionText: str
    type: str = "mcq"  # mcq | short_answer
    marks: int = 1
    options: list[str] | None = None
    correctAnswer: str = ""
    explanation: str = ""
    userResponse: str | int | None = None

    model_config = {"from_attributes": True}


class TopicScoreItem(BaseModel):
    topic: str
    score: float
    total: float


class PracticeAttemptResponse(BaseModel):
    id: str
    paperId: str
    startedAt: str = ""
    completedAt: str = ""
    score: float = 0.0
    totalMarks: int = 0
    percentage: float = 0.0
    answers: dict[str, Any] = Field(default_factory=dict)
    topicBreakdown: list[TopicScoreItem] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class PracticePaperCreate(BaseModel):
    course_id: str
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    duration_minutes: int = Field(default=60, ge=5, le=360)
    total_marks: int = Field(default=50, ge=1, le=500)
    difficulty: str = Field(default="medium")  # easy | medium | hard
    questions: list[PracticeQuestionCreate] = Field(default_factory=list)


class GeneratePracticePaperRequest(BaseModel):
    course_id: str
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    exam_type: str = Field(default="custom")  # quiz | mid_term | end_term | custom
    duration_minutes: int = Field(default=60, ge=10, le=360)
    total_marks: int = Field(default=50, ge=5, le=200)
    difficulty: str = Field(default="medium")  # easy | medium | hard | mixed
    mcq_count: int = Field(default=5, ge=0, le=30)
    short_answer_count: int = Field(default=3, ge=0, le=15)
    module_ids: list[str] = Field(default_factory=list)


class PracticePaperResponse(BaseModel):
    id: str
    courseId: str
    title: str
    description: str = ""
    examType: str = "custom"
    durationMinutes: int = 60
    totalMarks: int = 50
    questionCount: int = 0
    difficulty: str = "medium"
    status: str = "available"  # available | in_progress | submitted
    questions: list[PracticeQuestionResponse] = Field(default_factory=list)
    attempts: list[PracticeAttemptResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SubmitPracticeAttemptRequest(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)


class StudentAnalyticsResponse(BaseModel):
    total_attempts: int = 0
    average_score_percent: float = 0.0
    total_practice_questions: int = 0
    total_hours_spent: float = 0.0
    mastered_notebooks_count: int = 0
    recent_attempts: list[dict[str, Any]] = Field(default_factory=list)
    topic_mastery: list[dict[str, Any]] = Field(default_factory=list)
