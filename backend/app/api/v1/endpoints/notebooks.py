from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db
from app.models.notebook import NotebookPage, NotebookStickyNote, SubjectNotebook
from app.schemas.notebook import (
    NotebookCreate,
    NotebookResponse,
    NotebookUpdate,
    PageCreate,
    PageResponse,
    PageUpdate,
    StickyNoteCreate,
    StickyNoteResponse,
    StickyNoteUpdate,
)

router = APIRouter()


def _format_page(p: NotebookPage) -> PageResponse:
    date_str = p.created_at.strftime("%b %d, %Y") if p.created_at else ""
    cue_points = json.loads(p.cue_points_json) if p.cue_points_json else []
    tags = json.loads(p.tags_json) if p.tags_json else []
    return PageResponse(
        id=p.id,
        notebook_id=p.notebook_id,
        title=p.title,
        unitOrChapter=p.unit_or_chapter or "",
        date=date_str,
        cuePoints=cue_points,
        mainContent=p.notes_body or "",
        summary=p.summary or "",
        tags=tags,
    )


def _format_sticky_note(n: NotebookStickyNote) -> StickyNoteResponse:
    created_str = n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else ""
    return StickyNoteResponse(
        id=n.id,
        notebook_id=n.notebook_id,
        text=n.content,
        color=n.color or "yellow",
        createdAt=created_str,
        position_x=n.position_x,
        position_y=n.position_y,
    )


def _format_notebook(nb: SubjectNotebook) -> NotebookResponse:
    units = json.loads(nb.units_json) if nb.units_json else []
    pages = [_format_page(p) for p in nb.pages]
    sticky_notes = [_format_sticky_note(n) for n in nb.sticky_notes]
    return NotebookResponse(
        id=nb.id,
        student_id=nb.student_id,
        subjectCode=nb.subject_code or "",
        subjectTitle=nb.title,
        instructor=nb.instructor or "",
        semester=nb.semester or "",
        colorTheme=nb.color or "navy",
        targetGrade=nb.target_grade or "",
        targetExamDate=nb.target_exam_date or "",
        description=nb.description or "",
        units=units,
        progressPercent=nb.progress_percent,
        lastStudiedAt=nb.last_studied_at or "Just created",
        pages=pages,
        stickyNotes=sticky_notes,
    )


@router.get("", response_model=list[NotebookResponse])
async def list_notebooks(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[NotebookResponse]:
    query = (
        select(SubjectNotebook)
        .options(
            selectinload(SubjectNotebook.pages),
            selectinload(SubjectNotebook.sticky_notes),
        )
        .where(SubjectNotebook.student_id == current_user.id)
        .order_by(SubjectNotebook.created_at.desc())
    )
    result = await db.execute(query)
    notebooks = result.scalars().all()
    return [_format_notebook(nb) for nb in notebooks]


@router.post("", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
async def create_notebook(
    body: NotebookCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> NotebookResponse:
    notebook = SubjectNotebook(
        id=str(uuid.uuid4()),
        student_id=current_user.id,
        subject_code=body.subject_code.upper().strip(),
        title=body.subject_title.strip(),
        instructor=body.instructor.strip(),
        semester=body.semester.strip() if body.semester else None,
        color=body.color_theme,
        target_grade=body.target_grade,
        target_exam_date=body.target_exam_date,
        description=body.description,
        units_json=json.dumps(body.units) if body.units else None,
        progress_percent=0.0,
        last_studied_at="Just created",
    )
    db.add(notebook)
    await db.commit()

    # Re-fetch with relationships
    query = (
        select(SubjectNotebook)
        .options(selectinload(SubjectNotebook.pages), selectinload(SubjectNotebook.sticky_notes))
        .where(SubjectNotebook.id == notebook.id)
    )
    res = await db.execute(query)
    saved = res.scalar_one()
    return _format_notebook(saved)


@router.get("/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(
    notebook_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> NotebookResponse:
    query = (
        select(SubjectNotebook)
        .options(
            selectinload(SubjectNotebook.pages),
            selectinload(SubjectNotebook.sticky_notes),
        )
        .where(SubjectNotebook.id == notebook_id)
    )
    result = await db.execute(query)
    nb = result.scalar_one_or_none()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if current_user.role != "admin" and nb.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this notebook")

    return _format_notebook(nb)


@router.patch("/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(
    notebook_id: str,
    body: NotebookUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> NotebookResponse:
    query = (
        select(SubjectNotebook)
        .options(selectinload(SubjectNotebook.pages), selectinload(SubjectNotebook.sticky_notes))
        .where(SubjectNotebook.id == notebook_id)
    )
    result = await db.execute(query)
    nb = result.scalar_one_or_none()
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if current_user.role != "admin" and nb.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this notebook")

    if body.subject_code is not None:
        nb.subject_code = body.subject_code.upper().strip()
    if body.subject_title is not None:
        nb.title = body.subject_title.strip()
    if body.instructor is not None:
        nb.instructor = body.instructor.strip()
    if body.semester is not None:
        nb.semester = body.semester.strip()
    if body.color_theme is not None:
        nb.color = body.color_theme
    if body.target_grade is not None:
        nb.target_grade = body.target_grade
    if body.target_exam_date is not None:
        nb.target_exam_date = body.target_exam_date
    if body.description is not None:
        nb.description = body.description
    if body.units is not None:
        nb.units_json = json.dumps(body.units)
    if body.progress_percent is not None:
        nb.progress_percent = body.progress_percent
    if body.last_studied_at is not None:
        nb.last_studied_at = body.last_studied_at

    await db.commit()
    await db.refresh(nb)
    return _format_notebook(nb)


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(
    notebook_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    nb = await db.get(SubjectNotebook, notebook_id)
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if current_user.role != "admin" and nb.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this notebook")

    await db.delete(nb)
    await db.commit()


# ── Pages ───────────────────────────────────────────────────────────────────

@router.post("/{notebook_id}/pages", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page(
    notebook_id: str,
    body: PageCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PageResponse:
    nb = await db.get(SubjectNotebook, notebook_id)
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if current_user.role != "admin" and nb.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    page = NotebookPage(
        id=str(uuid.uuid4()),
        notebook_id=notebook_id,
        title=body.title,
        unit_or_chapter=body.unit_or_chapter,
        cue_points_json=json.dumps(body.cue_points) if body.cue_points else None,
        notes_body=body.main_content,
        summary=body.summary,
        tags_json=json.dumps(body.tags) if body.tags else None,
    )
    db.add(page)
    await db.commit()
    await db.refresh(page)
    return _format_page(page)


@router.patch("/pages/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: str,
    body: PageUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PageResponse:
    page = await db.get(NotebookPage, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    nb = await db.get(SubjectNotebook, page.notebook_id)
    if not nb or (current_user.role != "admin" and nb.student_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if body.title is not None:
        page.title = body.title
    if body.unit_or_chapter is not None:
        page.unit_or_chapter = body.unit_or_chapter
    if body.cue_points is not None:
        page.cue_points_json = json.dumps(body.cue_points)
    if body.main_content is not None:
        page.notes_body = body.main_content
    if body.summary is not None:
        page.summary = body.summary
    if body.tags is not None:
        page.tags_json = json.dumps(body.tags)

    await db.commit()
    await db.refresh(page)
    return _format_page(page)


@router.delete("/pages/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    page_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    page = await db.get(NotebookPage, page_id)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    nb = await db.get(SubjectNotebook, page.notebook_id)
    if not nb or (current_user.role != "admin" and nb.student_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(page)
    await db.commit()


# ── Sticky Notes ────────────────────────────────────────────────────────────

@router.post("/{notebook_id}/sticky-notes", response_model=StickyNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_sticky_note(
    notebook_id: str,
    body: StickyNoteCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> StickyNoteResponse:
    nb = await db.get(SubjectNotebook, notebook_id)
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if current_user.role != "admin" and nb.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    note = NotebookStickyNote(
        id=str(uuid.uuid4()),
        notebook_id=notebook_id,
        content=body.content,
        color=body.color,
        position_x=body.position_x,
        position_y=body.position_y,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return _format_sticky_note(note)


@router.patch("/sticky-notes/{note_id}", response_model=StickyNoteResponse)
async def update_sticky_note(
    note_id: str,
    body: StickyNoteUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> StickyNoteResponse:
    note = await db.get(NotebookStickyNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Sticky note not found")

    nb = await db.get(SubjectNotebook, note.notebook_id)
    if not nb or (current_user.role != "admin" and nb.student_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    if body.content is not None:
        note.content = body.content
    if body.color is not None:
        note.color = body.color
    if body.position_x is not None:
        note.position_x = body.position_x
    if body.position_y is not None:
        note.position_y = body.position_y

    await db.commit()
    await db.refresh(note)
    return _format_sticky_note(note)


@router.delete("/sticky-notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sticky_note(
    note_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    note = await db.get(NotebookStickyNote, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Sticky note not found")

    nb = await db.get(SubjectNotebook, note.notebook_id)
    if not nb or (current_user.role != "admin" and nb.student_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(note)
    await db.commit()
