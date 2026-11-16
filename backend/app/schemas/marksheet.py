from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class MarksheetRecordResponse(BaseModel):
    id: str
    batch_id: str
    student_id: str
    student_name: str = ""
    student_email: str = ""
    total_marks: float | None = None
    max_marks: int | None = None
    grade: str | None = None
    is_verified: bool = False
    breakdown: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class MarksheetBatchResponse(BaseModel):
    id: str
    exam_id: str
    exam_title: str = ""
    teacher_id: str
    batch_name: str
    status: str = "pending"  # pending | verified | published
    record_count: int = 0
    notes: str | None = None
    created_at: str = ""
    records: list[MarksheetRecordResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class MarksheetRecordItem(BaseModel):
    student_id: str
    total_marks: float
    max_marks: int = 50
    grade: str | None = None
    breakdown: dict[str, Any] = Field(default_factory=dict)


class MarksheetBatchCreate(BaseModel):
    exam_id: str
    batch_name: str = Field(min_length=1, max_length=255)
    notes: str | None = None
    records: list[MarksheetRecordItem] = Field(default_factory=list)


class PublishedResultResponse(BaseModel):
    id: str
    exam_id: str
    exam_title: str = ""
    student_id: str
    student_name: str = ""
    total_marks: float
    max_marks: int
    percentage: float
    grade: str | None = None
    rank: int | None = None
    published_at: str = ""
    breakdown: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}
