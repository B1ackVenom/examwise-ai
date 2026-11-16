from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db, require_teacher
from app.models.exam import Exam, ExamQuestion, RubricCriteria
from app.models.submission import QuestionEvaluation, Submission
from app.schemas.exam import (
    QuestionEvaluationResponse,
    SubmissionResponse,
    TeacherReviewEvaluationRequest,
)
from app.services.ai.base import AITask
from app.services.ai.manager import ai_manager
from app.services.aiml_engine import compute_hybrid_evaluation_score
from app.services.audit import record_audit_event

router = APIRouter()


class AIAnswerEvaluationResult(BaseModel):
    proposed_marks: float = Field(ge=0.0)
    explanation: str
    key_points_covered: list[str] = Field(default_factory=list)
    key_points_missing: list[str] = Field(default_factory=list)
    confidence_score: float = Field(default=0.9, ge=0.0, le=1.0)


@router.post("/submissions/{submission_id}/ai-evaluate", response_model=SubmissionResponse)
async def ai_evaluate_submission(
    submission_id: str,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    """
    Trigger AI-assisted answer evaluation for all questions in a student submission.
    AI evaluates student answers against model answers and rubric criteria.
    Results are stored as 'ai_proposed_marks' and require teacher review.
    """
    q_sub = (
        select(Submission)
        .options(selectinload(Submission.evaluations))
        .where(Submission.id == submission_id)
    )
    res = await db.execute(q_sub)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    answers_map: dict[str, str] = {}
    if submission.answer_text:
        try:
            answers_map = json.loads(submission.answer_text)
        except Exception:
            pass

    for ev in submission.evaluations:
        q_item = (
            select(ExamQuestion)
            .options(selectinload(ExamQuestion.rubric_criteria))
            .where(ExamQuestion.id == ev.exam_question_id)
        )
        res_q = await db.execute(q_item)
        exam_q = res_q.scalar_one_or_none()
        if not exam_q:
            continue

        student_ans = answers_map.get(exam_q.id, "")
        if not student_ans.strip():
            ev.ai_proposed_marks = 0.0
            ev.ai_explanation = "No answer submitted."
            ev.ai_evidence = "Blank response."
            ev.ai_provider_used = "rule_engine"
            continue

        rubric_texts = []
        for r in exam_q.rubric_criteria:
            rubric_texts.append(f"- Criterion: {r.criterion} (Max {r.max_marks} Marks). {r.description or ''}")
        rubrics_str = "\n".join(rubric_texts) if rubric_texts else "General academic correctness."

        eval_prompt = (
            f"You are an expert university examiner evaluating a student answer.\n"
            f"Question [{exam_q.marks} Marks]:\n{exam_q.question_text}\n\n"
            f"Model Answer / Expected Points:\n{exam_q.expected_answer or 'Standard university syllabus criteria'}\n\n"
            f"Evaluation Rubric Criteria:\n{rubrics_str}\n\n"
            f"Student Submitted Answer:\n{student_ans}\n\n"
            f"Instructions:\n"
            f"- Evaluate the student answer strictly out of {exam_q.marks} maximum marks.\n"
            f"- Assign proposed_marks between 0.0 and {float(exam_q.marks)}.\n"
            f"- In explanation, provide concise objective feedback (1-2 sentences) justifying the marks.\n"
            f"- List key_points_covered and key_points_missing."
        )

        try:
            eval_result, ai_resp = await ai_manager.generate_structured(
                task=AITask.ANSWER_EVALUATION,
                prompt=eval_prompt,
                schema=AIAnswerEvaluationResult,
                db=db,
                temperature=0.1,
                max_tokens=600,
            )
            # Cap proposed marks to max question marks
            awarded = min(float(exam_q.marks), max(0.0, eval_result.proposed_marks))
            key_concepts = [r.criterion for r in exam_q.rubric_criteria]
            hybrid_eval = compute_hybrid_evaluation_score(
                max_marks=float(exam_q.marks),
                ai_proposed_marks=awarded,
                student_text=student_ans,
                model_answer=exam_q.expected_answer or "",
                key_concepts=key_concepts,
            )
            ev.ai_proposed_marks = awarded
            ev.ai_explanation = eval_result.explanation
            ev.ai_evidence = (
                f"Hybrid NLP Recommendation: {hybrid_eval['recommended_hybrid_marks']}/{exam_q.marks} | "
                f"Cosine Sim: {hybrid_eval['cosine_similarity']:.2f} | "
                f"Concept Recall: {hybrid_eval['concept_recall']*100:.0f}% | "
                f"Covered: {', '.join(eval_result.key_points_covered or hybrid_eval['matched_concepts'])}; "
                f"Missing: {', '.join(eval_result.key_points_missing or hybrid_eval['missing_concepts'])}"
            )
            ev.ai_provider_used = ai_resp.provider_type or "ollama"
        except Exception as e:
            # Fallback to pure deterministic mathematical NLP evaluation if LLM is unavailable
            key_concepts = [r.criterion for r in exam_q.rubric_criteria]
            nlp_eval = compute_hybrid_evaluation_score(
                max_marks=float(exam_q.marks),
                ai_proposed_marks=round(exam_q.marks * 0.5, 1),
                student_text=student_ans,
                model_answer=exam_q.expected_answer or "",
                key_concepts=key_concepts,
            )
            ev.ai_proposed_marks = nlp_eval["deterministic_nlp_marks"]
            ev.ai_explanation = f"Mathematical NLP Cosine Similarity evaluation ({nlp_eval['cosine_similarity']:.2f})."
            ev.ai_evidence = f"Cosine Sim: {nlp_eval['cosine_similarity']:.2f} | Matched: {', '.join(nlp_eval['matched_concepts'])}"
            ev.ai_provider_used = "mathematical_nlp_engine"

    submission.status = "under_review"
    await db.commit()

    await record_audit_event(
        db=db,
        action="submission.ai_evaluated",
        actor_id=current_user.id,
        entity_type="submission",
        entity_id=submission.id,
        after={"status": "under_review", "evaluations_count": len(submission.evaluations)},
    )
    await db.commit()

    # Re-fetch
    from app.api.v1.endpoints.submissions import _format_submission
    q_fresh = (
        select(Submission)
        .options(selectinload(Submission.evaluations))
        .where(Submission.id == submission.id)
    )
    res_fresh = await db.execute(q_fresh)
    return await _format_submission(res_fresh.scalar_one(), db)


@router.put("/evaluations/{evaluation_id}/teacher-review", response_model=QuestionEvaluationResponse)
async def review_question_evaluation(
    evaluation_id: str,
    body: TeacherReviewEvaluationRequest,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> QuestionEvaluationResponse:
    """
    Teacher review and final marks approval for an individual question evaluation.
    Allows manual score corrections, teacher comments, and approval.
    Produces an immutable AuditEvent recording before and after marks.
    """
    ev = await db.get(QuestionEvaluation, evaluation_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Question evaluation not found")

    exam_q = await db.get(ExamQuestion, ev.exam_question_id)
    max_m = exam_q.marks if exam_q else 100
    if body.marks > max_m:
        raise HTTPException(status_code=400, detail=f"Marks cannot exceed maximum question marks ({max_m})")

    before_state = {
        "teacher_marks": ev.teacher_marks,
        "is_approved": ev.is_approved,
        "ai_proposed_marks": ev.ai_proposed_marks,
    }

    now = datetime.now(timezone.utc)
    ev.teacher_marks = body.marks
    ev.teacher_comment = body.comment
    ev.teacher_id = current_user.id
    ev.is_approved = body.approve
    if body.approve:
        ev.approved_at = now

    await db.commit()

    after_state = {
        "teacher_marks": ev.teacher_marks,
        "is_approved": ev.is_approved,
        "teacher_id": current_user.id,
    }

    await record_audit_event(
        db=db,
        action="marks.approved" if body.approve else "marks.updated",
        actor_id=current_user.id,
        entity_type="question_evaluation",
        entity_id=ev.id,
        before=before_state,
        after=after_state,
    )
    await db.commit()

    # Format response
    submission = await db.get(Submission, ev.submission_id)
    student_ans = ""
    if submission and submission.answer_text:
        try:
            student_ans = json.loads(submission.answer_text).get(ev.exam_question_id, "")
        except Exception:
            student_ans = submission.answer_text

    return QuestionEvaluationResponse(
        id=ev.id,
        submission_id=ev.submission_id,
        exam_question_id=ev.exam_question_id,
        question_text=exam_q.question_text if exam_q else "",
        max_marks=exam_q.marks if exam_q else 5,
        student_answer=student_ans,
        ai_proposed_marks=ev.ai_proposed_marks,
        ai_explanation=ev.ai_explanation,
        ai_evidence=ev.ai_evidence,
        ai_provider_used=ev.ai_provider_used,
        teacher_marks=ev.teacher_marks,
        teacher_comment=ev.teacher_comment,
        teacher_id=ev.teacher_id,
        is_approved=ev.is_approved,
        approved_at=ev.approved_at.isoformat() if ev.approved_at else None,
    )


@router.post("/submissions/{submission_id}/finalize", response_model=SubmissionResponse)
async def finalize_submission_evaluation(
    submission_id: str,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> SubmissionResponse:
    """
    Finalize submission grading when all questions are reviewed.
    Sets status to 'evaluated'. Emits immutable audit event.
    """
    q_sub = (
        select(Submission)
        .options(selectinload(Submission.evaluations))
        .where(Submission.id == submission_id)
    )
    res = await db.execute(q_sub)
    submission = res.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    unapproved = [ev for ev in submission.evaluations if not ev.is_approved]
    if unapproved:
        raise HTTPException(
            status_code=400,
            detail=f"{len(unapproved)} question(s) still require teacher approval before finalizing.",
        )

    before_status = submission.status
    submission.status = "evaluated"
    await db.commit()

    await record_audit_event(
        db=db,
        action="submission.finalized",
        actor_id=current_user.id,
        entity_type="submission",
        entity_id=submission.id,
        before={"status": before_status},
        after={"status": "evaluated"},
    )
    await db.commit()

    from app.api.v1.endpoints.submissions import _format_submission
    return await _format_submission(submission, db)
