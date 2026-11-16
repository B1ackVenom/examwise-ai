from __future__ import annotations

from pydantic import BaseModel, Field


class StickyNoteCreate(BaseModel):
    content: str = Field(min_length=1)
    color: str = Field(default="yellow")  # yellow | pink | cyan | lime | lavender
    position_x: float | None = None
    position_y: float | None = None


class StickyNoteUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1)
    color: str | None = None
    position_x: float | None = None
    position_y: float | None = None


class StickyNoteResponse(BaseModel):
    id: str
    notebook_id: str
    text: str
    color: str = "yellow"
    createdAt: str = ""
    position_x: float | None = None
    position_y: float | None = None

    model_config = {"from_attributes": True}


class PageCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    unit_or_chapter: str | None = ""
    cue_points: list[str] = Field(default_factory=list)
    main_content: str = ""
    summary: str = ""
    tags: list[str] = Field(default_factory=list)


class PageUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    unit_or_chapter: str | None = None
    cue_points: list[str] | None = None
    main_content: str | None = None
    summary: str | None = None
    tags: list[str] | None = None


class PageResponse(BaseModel):
    id: str
    notebook_id: str
    title: str
    unitOrChapter: str = ""
    date: str = ""
    cuePoints: list[str] = Field(default_factory=list)
    mainContent: str = ""
    summary: str = ""
    tags: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class NotebookCreate(BaseModel):
    subject_code: str = Field(min_length=1, max_length=50)
    subject_title: str = Field(min_length=1, max_length=255)
    instructor: str = Field(min_length=1, max_length=255)
    semester: str | None = ""
    color_theme: str = Field(default="navy")  # navy | emerald | crimson | amethyst | amber | slate | teal
    target_grade: str | None = ""
    target_exam_date: str | None = ""
    description: str | None = ""
    units: list[str] = Field(default_factory=list)


class NotebookUpdate(BaseModel):
    subject_code: str | None = None
    subject_title: str | None = None
    instructor: str | None = None
    semester: str | None = None
    color_theme: str | None = None
    target_grade: str | None = None
    target_exam_date: str | None = None
    description: str | None = None
    units: list[str] | None = None
    progress_percent: float | None = None
    last_studied_at: str | None = None


class NotebookResponse(BaseModel):
    id: str
    student_id: str
    subjectCode: str
    subjectTitle: str
    instructor: str
    semester: str = ""
    colorTheme: str = "navy"
    targetGrade: str = ""
    targetExamDate: str = ""
    description: str = ""
    units: list[str] = Field(default_factory=list)
    progressPercent: float = 0.0
    lastStudiedAt: str = ""
    pages: list[PageResponse] = Field(default_factory=list)
    stickyNotes: list[StickyNoteResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}
