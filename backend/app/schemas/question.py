from __future__ import annotations

from pydantic import BaseModel, Field


class ImportantQuestionCreate(BaseModel):
    course_id: str
    module_id: str | None = None
    question: str = Field(min_length=1)
    marks: int = Field(default=5, ge=1, le=50)
    difficulty: str = Field(default="medium")  # easy | medium | hard
    importance_rating: str = Field(default="High")  # Very High | High | Medium
    frequency_score: int = Field(default=1, ge=1)
    blooms_taxonomy: str = Field(default="Understand")  # Remember | Understand | Apply | Analyze | Evaluate
    expected_key_points: list[str] = Field(default_factory=list)
    model_answer: str = Field(default="")
    confidence_label: str | None = None
    source_resources: list[str] = Field(default_factory=list)


class ImportantQuestionResponse(BaseModel):
    id: str
    courseId: str
    moduleId: str
    question: str
    marks: int = 5
    difficulty: str = "medium"
    importanceRating: str = "High"
    frequencyScore: int = 1
    bloomsTaxonomy: str = "Understand"
    sourceResources: list[str] = Field(default_factory=list)
    expectedKeyPoints: list[str] = Field(default_factory=list)
    modelAnswer: str = ""
    isBookmarked: bool = False
    confidenceLabel: str | None = None

    model_config = {"from_attributes": True}


class PredictQuestionsRequest(BaseModel):
    course_id: str
    module_id: str | None = None
    count: int = Field(default=5, ge=1, le=20)
    difficulty: str | None = None  # None for mixed, or easy | medium | hard
    focus_topic: str | None = None


class BookmarkRequest(BaseModel):
    notes: str | None = None


class BookmarkResponse(BaseModel):
    id: str
    question_id: str
    student_id: str
    notes: str | None = None
    created_at: str = ""

    model_config = {"from_attributes": True}
