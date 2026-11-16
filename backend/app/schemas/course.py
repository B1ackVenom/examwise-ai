from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field, field_validator


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=50)
    description: str | None = None
    department: str | None = Field(default=None, max_length=100)
    subject_area: str | None = Field(default=None, max_length=100)
    semester: str | None = Field(default=None, max_length=50)
    credits: int = Field(default=3, ge=1, le=12)
    academic_year: str | None = Field(default=None, max_length=50)


class CourseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, max_length=50)
    description: str | None = None
    department: str | None = None
    subject_area: str | None = None
    semester: str | None = None
    credits: int | None = Field(default=None, ge=1, le=12)
    academic_year: str | None = None
    is_active: bool | None = None


class CourseResponse(BaseModel):
    id: str
    title: str
    code: str | None = None
    description: str | None = None
    department: str | None = None
    subject_area: str | None = None
    semester: str | None = None
    credits: int = 3
    academic_year: str | None = None
    is_active: bool = True
    teacher_id: str
    instructor: str = ""
    modules_count: int = 0
    enrolled_students_count: int = 0
    progress: float = 0.0

    model_config = {"from_attributes": True}


class ModuleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    order_index: int = Field(default=0, ge=0)
    learning_hours: int = Field(default=10, ge=1)
    key_topics: list[str] = Field(default_factory=list)


class ModuleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    order_index: int | None = Field(default=None, ge=0)
    learning_hours: int | None = Field(default=None, ge=1)
    status: str | None = Field(default=None)  # not_started | in_progress | completed
    key_topics: list[str] | None = None


class ModuleResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: str | None = None
    order: int = 0
    learning_hours: int = 10
    status: str = "not_started"
    key_topics: list[str] = Field(default_factory=list)
    resource_count: int = 0

    model_config = {"from_attributes": True}


class ResourceCreate(BaseModel):
    module_id: str | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    resource_type: str = Field(default="pdf")  # pdf | docx | pptx | txt | url | video | notes
    url: str | None = None
    file_path: str | None = None
    tags: list[str] = Field(default_factory=list)


class ResourceResponse(BaseModel):
    id: str
    course_id: str
    module_id: str | None = None
    title: str
    description: str | None = None
    type: str = "pdf"
    file_size: str = "0 KB"
    uploaded_at: str = ""
    uploaded_by: str = ""
    status: str = "ready"
    tags: list[str] = Field(default_factory=list)
    downloads_count: int = 0
    url: str | None = None

    model_config = {"from_attributes": True}
