from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db, require_teacher
from app.models.exam import Exam, ExamQuestion
from app.models.submission import QuestionEvaluation, Submission
from app.models.user import User
from app.schemas.exam import (
    QuestionEvaluationResponse,
    SubmissionCreate,
    SubmissionResponse,
)
from app.services.audit import record_audit_event

router = APIRouter()


async def _format_submission(sub: Submission, db: AsyncSession) -> SubmissionResponse:
    exam = await db.get(Exam, sub.exam_id)
    student = await db.get(User, sub.student_id)

    eval_responses = []
    total_score = 0.0
    all_evaluated = True

    for ev in sub.evaluations:
        q = await db.get(ExamQuestion, ev.exam_question_id)
        # Parse answers
        student_ans = ""
        if sub.answer_text:
            try:
                ans_dict = json.loads(sub.answer_text)
                student_ans = ans_dict.get(ev.exam_question_id, "")
            except Exception:
                student_ans = sub.answer_text

        marks_awarded = ev.teacher_marks if ev.teacher_marks is not None else ev.ai_proposed_marks
        if marks_awarded is not None:
            total_score += marks_awarded
        if not ev.is_approved:
            all_evaluated = False

        appr_str = ev.approved_at.isoformat() if ev.approved_at else None

        eval_responses.append(
            QuestionEvaluationResponse(
                id=ev.id,
                submission_id=ev.submission_id,
                exam_question_id=ev.exam_question_id,
                question_text=q.question_text if q else "",
                max_marks=q.marks if q else 5,
                student_answer=student_ans,
                ai_proposed_marks=ev.ai_proposed_marks,
                ai_explanation=ev.ai_explanation,
                ai_evidence=ev.ai_evidence,
                ai_provider_used=ev.ai_provider_used,
                teacher_marks=ev.teacher_marks,
                teacher_comment=ev.teacher_comment,
                teacher_id=ev.teacher_id,
                is_approved=ev.is_approved,
                approved_at=appr_str,
            )
        )

    sub_time_str = sub.submitted_at.isoformat() if sub.submitted_at else ""

    return SubmissionResponse(
        id=sub.id,
        exam_id=sub.exam_id,
        exam_title=exam.title if exam else "",
        student_id=sub.student_id,
        student_name=student.full_name if student else "",
        student_email=student.email if student else "",
        status=sub.status,
        submitted_at=sub_time_str,
        total_score=total_score if (eval_responses and all_evaluated) else None,
        max_marks=exam.total_marks if exam else 50,
        is_fully_evaluated=all_evaluated and bool(eval_responses),
        evaluations=eval_responses,
    )


@router.post("/exams/{exam_id}/submissions", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_exam_answers(
    exam_id: str,
    body: SubmissionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if exam.status not in ("published", "ongoing"):
        raise HTTPException(status_code=400, detail="Exam is not currently accepting submissions")

    # Check for existing submission
    q_exist = select(Submission).where(
        Submission.exam_id == exam_id,
        Submission.student_id == current_user.id,
    )
    res_exist = await db.execute(q_exist)
    if res_exist.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already submitted this exam")

    # Store answers as mapping
    answers_map = {item.exam_question_id: item.answer_text for item in body.answers}
    now = datetime.now(timezone.utc)

    submission = Submission(
        id=str(uuid.uuid4()),
        exam_id=exam_id,
        student_id=current_user.id,
        answer_text=json.dumps(answers_map),
        submitted_at=now,
        status="submitted",
    )
    db.add(submission)
    await db.flush()

    # Pre-create empty QuestionEvaluations for each submitted question
    # Fetch questions for exam
    q_questions = select(ExamQuestion).where(ExamQuestion.exam_id == exam_id)
    questions = (await db.execute(q_questions)).scalars().all()

    for q in questions:
        ev = QuestionEvaluation(
            id=str(uuid.uuid4()),
            submission_id=submission.id,
            exam_question_id=q.id,
            is_approved=False,
        )
        db.add(ev)

    await db.commit()

    await record_audit_event(
        db=db,
        action="submission.created",
        actor_id=current_user.id,
        entity_type="submission",
        entity_id=submission.id,
        after={"exam_id": exam_id, "questions_answered": len(body.answers)},
    )
    await db.commit()

    q_sub = (
        select(Submission)
        .options(selectinload(Submission.evaluations))
        .where(Submission.id == submission.id)
    )
    res = await db.execute(q_sub)
    return await _format_submission(res.scalar_one(), db)


@router.get("/exams/{exam_id}/submissions", response_model=list[SubmissionResponse])
async def list_exam_submissions(
    exam_id: str,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> list[SubmissionResponse]:
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    q_subs = (
        select(Submission)
        .options(selectinload(Submission.evaluations))
        .where(Submission.exam_id == exam_id)
        .order_by(Submission.submitted_at.desc())
    )
    subs = (await db.execute(q_subs)).scalars().all()
    return [await _format_submission(s, db) for s in subs]


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    q_sub = (
        select(Submission)
        .options(selectinload(Submission.evaluations))
        .where(Submission.id == submission_id)
    )
    res = await db.execute(q_sub)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Access control: Student can only view their own submission
    if current_user.role == "student" and submission.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this submission")

    return await _format_submission(submission, db)
