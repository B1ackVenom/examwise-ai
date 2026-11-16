from __future__ import annotations

import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db, require_teacher
from app.models.course import Course
from app.models.exam import Exam, ExamQuestion, RubricCriteria
from app.models.submission import Submission
from app.schemas.exam import (
    ExamCreate,
    ExamQuestionCreate,
    ExamQuestionResponse,
    ExamQuestionUpdate,
    ExamResponse,
    ExamUpdate,
    RubricCriteriaCreate,
    RubricCriteriaResponse,
)
from app.services.audit import record_audit_event

router = APIRouter()


def _format_question(q: ExamQuestion) -> ExamQuestionResponse:
    options = json.loads(q.options_json) if q.options_json else None
    rubrics = [RubricCriteriaResponse.model_validate(r) for r in q.rubric_criteria]
    return ExamQuestionResponse(
        id=q.id,
        exam_id=q.exam_id,
        question_text=q.question_text,
        question_type=q.question_type,
        marks=q.marks,
        expected_answer=q.expected_answer,
        options=options,
        topic=q.topic,
        difficulty=q.difficulty,
        order_index=q.order_index,
        rubric_criteria=rubrics,
    )


def _format_exam(e: Exam, q_count: int | None = None, sub_count: int | None = None) -> ExamResponse:
    questions = [_format_question(q) for q in e.questions] if hasattr(e, "questions") and e.questions else []
    actual_q_count = len(questions) if questions else (q_count or 0)
    actual_sub_count = len(e.submissions) if hasattr(e, "submissions") and e.submissions else (sub_count or 0)

    sched_str = e.scheduled_at.isoformat() if e.scheduled_at else None
    created_str = e.created_at.isoformat() if e.created_at else ""

    return ExamResponse(
        id=e.id,
        course_id=e.course_id,
        teacher_id=e.teacher_id,
        title=e.title,
        description=e.description,
        exam_type=e.exam_type,
        total_marks=e.total_marks,
        duration_minutes=e.duration_minutes,
        scheduled_at=sched_str,
        status=e.status,
        question_count=actual_q_count,
        submission_count=actual_sub_count,
        questions=questions,
        created_at=created_str,
    )


# ── Exam Endpoints ───────────────────────────────────────────────────────────

@router.get("", response_model=list[ExamResponse])
async def list_exams(
    current_user: CurrentUser,
    course_id: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
) -> list[ExamResponse]:
    query = (
        select(Exam)
        .options(
            selectinload(Exam.questions).selectinload(ExamQuestion.rubric_criteria),
            selectinload(Exam.submissions),
        )
        .order_by(Exam.created_at.desc())
    )

    if course_id and course_id != "all":
        query = query.where(Exam.course_id == course_id)
    if status_filter and status_filter != "all":
        query = query.where(Exam.status == status_filter)

    # Students only see published or ongoing exams
    if current_user.role == "student":
        query = query.where(Exam.status.in_(["published", "ongoing", "completed"]))

    res = await db.execute(query)
    exams = res.scalars().all()
    return [_format_exam(e) for e in exams]


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    body: ExamCreate,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> ExamResponse:
    course = await db.get(Course, body.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    exam = Exam(
        id=str(uuid.uuid4()),
        course_id=body.course_id,
        teacher_id=current_user.id,
        title=body.title,
        description=body.description,
        exam_type=body.exam_type,
        total_marks=body.total_marks,
        duration_minutes=body.duration_minutes,
        scheduled_at=body.scheduled_at,
        status="draft",
    )
    db.add(exam)
    await db.flush()

    for idx, q_in in enumerate(body.questions, start=1):
        q = ExamQuestion(
            id=str(uuid.uuid4()),
            exam_id=exam.id,
            question_text=q_in.question_text,
            question_type=q_in.question_type,
            marks=q_in.marks,
            expected_answer=q_in.expected_answer,
            options_json=json.dumps(q_in.options) if q_in.options else None,
            topic=q_in.topic,
            difficulty=q_in.difficulty,
            order_index=q_in.order_index or idx,
        )
        db.add(q)
        await db.flush()

        for r_idx, r_in in enumerate(q_in.rubric_criteria, start=1):
            r = RubricCriteria(
                id=str(uuid.uuid4()),
                exam_question_id=q.id,
                criterion=r_in.criterion,
                max_marks=r_in.max_marks,
                description=r_in.description,
                order_index=r_in.order_index or r_idx,
            )
            db.add(r)

    await db.commit()

    await record_audit_event(
        db=db,
        action="exam.created",
        actor_id=current_user.id,
        entity_type="exam",
        entity_id=exam.id,
        after={"title": exam.title, "total_marks": exam.total_marks},
    )
    await db.commit()

    q_exam = (
        select(Exam)
        .options(
            selectinload(Exam.questions).selectinload(ExamQuestion.rubric_criteria),
            selectinload(Exam.submissions),
        )
        .where(Exam.id == exam.id)
    )
    res = await db.execute(q_exam)
    return _format_exam(res.scalar_one())


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ExamResponse:
    q_exam = (
        select(Exam)
        .options(
            selectinload(Exam.questions).selectinload(ExamQuestion.rubric_criteria),
            selectinload(Exam.submissions),
        )
        .where(Exam.id == exam_id)
    )
    res = await db.execute(q_exam)
    exam = res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if current_user.role == "student" and exam.status == "draft":
        raise HTTPException(status_code=403, detail="Exam is not published yet")

    return _format_exam(exam)


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: str,
    body: ExamUpdate,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> ExamResponse:
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    before_state = {"status": exam.status, "total_marks": exam.total_marks, "title": exam.title}

    if body.title is not None:
        exam.title = body.title
    if body.description is not None:
        exam.description = body.description
    if body.exam_type is not None:
        exam.exam_type = body.exam_type
    if body.total_marks is not None:
        exam.total_marks = body.total_marks
    if body.duration_minutes is not None:
        exam.duration_minutes = body.duration_minutes
    if body.scheduled_at is not None:
        exam.scheduled_at = body.scheduled_at
    if body.status is not None:
        exam.status = body.status

    await db.commit()

    await record_audit_event(
        db=db,
        action="exam.updated",
        actor_id=current_user.id,
        entity_type="exam",
        entity_id=exam.id,
        before=before_state,
        after={"status": exam.status, "total_marks": exam.total_marks, "title": exam.title},
    )
    await db.commit()

    q_exam = (
        select(Exam)
        .options(
            selectinload(Exam.questions).selectinload(ExamQuestion.rubric_criteria),
            selectinload(Exam.submissions),
        )
        .where(Exam.id == exam_id)
    )
    res = await db.execute(q_exam)
    return _format_exam(res.scalar_one())


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: str,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> None:
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    await record_audit_event(
        db=db,
        action="exam.deleted",
        actor_id=current_user.id,
        entity_type="exam",
        entity_id=exam.id,
        before={"title": exam.title},
    )
    await db.delete(exam)
    await db.commit()


@router.post("/{exam_id}/publish", response_model=ExamResponse)
async def publish_exam(
    exam_id: str,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> ExamResponse:
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    before_status = exam.status
    exam.status = "published"
    await db.commit()

    await record_audit_event(
        db=db,
        action="exam.published",
        actor_id=current_user.id,
        entity_type="exam",
        entity_id=exam.id,
        before={"status": before_status},
        after={"status": "published"},
    )
    await db.commit()

    q_exam = (
        select(Exam)
        .options(
            selectinload(Exam.questions).selectinload(ExamQuestion.rubric_criteria),
            selectinload(Exam.submissions),
        )
        .where(Exam.id == exam_id)
    )
    res = await db.execute(q_exam)
    return _format_exam(res.scalar_one())


# ── Exam Questions ───────────────────────────────────────────────────────────

@router.post("/{exam_id}/questions", response_model=ExamQuestionResponse, status_code=status.HTTP_201_CREATED)
async def add_exam_question(
    exam_id: str,
    body: ExamQuestionCreate,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> ExamQuestionResponse:
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    q = ExamQuestion(
        id=str(uuid.uuid4()),
        exam_id=exam.id,
        question_text=body.question_text,
        question_type=body.question_type,
        marks=body.marks,
        expected_answer=body.expected_answer,
        options_json=json.dumps(body.options) if body.options else None,
        topic=body.topic,
        difficulty=body.difficulty,
        order_index=body.order_index,
    )
    db.add(q)
    await db.flush()

    for idx, r_in in enumerate(body.rubric_criteria, start=1):
        r = RubricCriteria(
            id=str(uuid.uuid4()),
            exam_question_id=q.id,
            criterion=r_in.criterion,
            max_marks=r_in.max_marks,
            description=r_in.description,
            order_index=r_in.order_index or idx,
        )
        db.add(r)

    await db.commit()

    q_fresh = (
        select(ExamQuestion)
        .options(selectinload(ExamQuestion.rubric_criteria))
        .where(ExamQuestion.id == q.id)
    )
    res = await db.execute(q_fresh)
    return _format_question(res.scalar_one())
