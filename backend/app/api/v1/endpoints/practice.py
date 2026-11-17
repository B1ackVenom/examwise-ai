from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, model_validator
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db
from app.models.course import Course, CourseModule, LearningResource
from app.models.notebook import SubjectNotebook
from app.models.practice import PracticeAttempt, PracticePaper, PracticeQuestion
from app.schemas.practice import (
    GeneratePracticePaperRequest,
    PracticeAttemptResponse,
    PracticePaperCreate,
    PracticePaperResponse,
    PracticeQuestionResponse,
    StudentAnalyticsResponse,
    SubmitPracticeAttemptRequest,
    TopicScoreItem,
)
from app.services.ai.base import AITask
from app.services.ai.manager import ai_manager
from app.services.aiml_engine import StudentFeatureVector, predict_student_performance
from app.services.document_context import build_multi_document_context

router = APIRouter()


class AIGeneratedQuestionItem(BaseModel):
    question_number: int
    sub_question_label: str | None = None  # e.g. "Q1(a)", "Q1(b)", "Q2(a)"
    module_number: int = 1
    question_text: str
    type: str = "descriptive"  # descriptive | short_answer | mcq
    marks: int = 5
    options: list[str] | None = None
    correct_answer: str = ""
    explanation: str = ""
    topic: str | None = None
    difficulty: str = "medium"


class AIGeneratedPaperResult(BaseModel):
    title: str = "Examination Practice Paper"
    description: str = "AI generated examination practice paper."
    duration_minutes: int = 60
    total_marks: int = 25
    difficulty: str = "medium"
    questions: list[AIGeneratedQuestionItem] = []
    sub_questions: list[dict[str, Any]] | None = None

    @model_validator(mode="after")
    def populate_questions_from_sub_questions(self) -> AIGeneratedPaperResult:
        if not self.questions and self.sub_questions:
            mapped_q = []
            for idx, sq in enumerate(self.sub_questions, start=1):
                label = sq.get("sub_question") or f"Q{idx}"
                q_text = sq.get("question_text") or sq.get("explanation") or f"Question {label}"
                mapped_q.append(
                    AIGeneratedQuestionItem(
                        question_number=idx,
                        sub_question_label=str(label),
                        module_number=min(5, (idx + 1) // 2),
                        question_text=str(q_text),
                        type="descriptive",
                        marks=sq.get("marks", 5),
                        correct_answer=str(sq.get("correct_answer") or ""),
                        explanation=str(sq.get("explanation") or ""),
                        topic=sq.get("topic"),
                    )
                )
            self.questions = mapped_q
            self.total_marks = sum(q.marks for q in self.questions)
        return self


def _format_question(q: PracticeQuestion) -> PracticeQuestionResponse:
    options = json.loads(q.options_json) if q.options_json else None
    return PracticeQuestionResponse(
        id=q.id,
        paperId=q.paper_id,
        questionNumber=q.question_number,
        questionText=q.question_text,
        type=q.question_type,
        marks=q.marks,
        options=options,
        correctAnswer=q.correct_answer,
        explanation=q.explanation,
    )


def _format_attempt(att: PracticeAttempt) -> PracticeAttemptResponse:
    answers = json.loads(att.answers_json) if att.answers_json else {}
    breakdown_raw = json.loads(att.topic_breakdown_json) if att.topic_breakdown_json else []
    breakdown = [TopicScoreItem(**item) for item in breakdown_raw]
    started = att.started_at.isoformat() if att.started_at else ""
    completed = att.submitted_at.isoformat() if att.submitted_at else ""

    return PracticeAttemptResponse(
        id=att.id,
        paperId=att.paper_id,
        startedAt=started,
        completedAt=completed,
        score=att.score or 0.0,
        totalMarks=att.total_marks or 0,
        percentage=att.percentage or 0.0,
        answers=answers,
        topicBreakdown=breakdown,
    )


def _format_paper(p: PracticePaper, student_id: str) -> PracticePaperResponse:
    questions = [_format_question(q) for q in p.questions]
    student_attempts = [a for a in p.attempts if a.student_id == student_id]
    attempts = [_format_attempt(a) for a in student_attempts]
    status_str = "submitted" if student_attempts else p.status

    exam_type = "custom"
    if p.config_json:
        try:
            cfg = json.loads(p.config_json)
            exam_type = cfg.get("exam_type", "custom")
        except Exception:
            pass

    return PracticePaperResponse(
        id=p.id,
        courseId=p.course_id,
        title=p.title,
        description=p.description or "",
        examType=exam_type,
        durationMinutes=p.duration_minutes,
        totalMarks=p.total_marks,
        questionCount=len(p.questions),
        difficulty=p.difficulty,
        status=status_str,
        questions=questions,
        attempts=attempts,
    )


@router.get("/practice-papers", response_model=list[PracticePaperResponse])
async def list_practice_papers(
    current_user: CurrentUser,
    course_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[PracticePaperResponse]:
    query = (
        select(PracticePaper)
        .options(
            selectinload(PracticePaper.questions),
            selectinload(PracticePaper.attempts),
        )
        .order_by(PracticePaper.created_at.desc())
    )
    if course_id and course_id != "all":
        query = query.where(PracticePaper.course_id == course_id)

    result = await db.execute(query)
    papers = result.scalars().all()
    return [_format_paper(p, current_user.id) for p in papers]


@router.post("/practice-papers/generate", response_model=PracticePaperResponse, status_code=status.HTTP_201_CREATED)
@router.post("/practice/generate", response_model=PracticePaperResponse, status_code=status.HTTP_201_CREATED)
async def generate_practice_paper(
    body: GeneratePracticePaperRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PracticePaperResponse:
    course = await db.get(Course, body.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Configure exam type preset parameters and prompt
    exam_type = body.exam_type.lower()
    if exam_type == "mid_term":
        total_marks = body.total_marks if body.total_marks in (20, 25) else 25
        duration_minutes = body.duration_minutes if body.duration_minutes != 60 else 60
        max_gen_tokens = 1800
        prompt_exam_pattern = (
            f"EXAM TYPE: ACADEMIC MID-TERM EXAMINATION (Total Marks: {total_marks}, Duration: {duration_minutes} Minutes).\n\n"
            f"STRICT EXAMINATION PATTERN (NO MULTIPLE CHOICE QUESTIONS):\n"
            f"- Strictly ZERO Multiple Choice Questions (MCQs). All questions MUST be descriptive/analytical engineering questions (type: 'descriptive').\n"
            f"- MODULE 1 (Total: 10 Marks):\n"
            f"  Generate exactly 2 sub-questions totaling 10 Marks: either [5 Marks + 5 Marks] or [4 Marks + 6 Marks].\n"
            f"  Labels: 'Q1(a)' and 'Q1(b)'.\n"
            f"- MODULE 2 (Total: {total_marks - 10} Marks):\n"
            f"  Generate sub-questions totaling {total_marks - 10} Marks:\n"
            f"  * If total is 25 Marks: three 5-mark questions [5M + 5M + 5M] labeled 'Q2(a)', 'Q2(b)', and 'Q2(c)'.\n"
            f"  * If total is 20 Marks: two 5-mark questions [5M + 5M] labeled 'Q2(a)' and 'Q2(b)'.\n\n"
            f"Requirements for each question:\n"
            f"- question_number: sequential integer (1, 2, 3...)\n"
            f"- sub_question_label: 'Q1(a)', 'Q1(b)', 'Q2(a)', etc.\n"
            f"- module_number: 1 or 2\n"
            f"- question_text: Full descriptive question prompt\n"
            f"- type: 'descriptive'\n"
            f"- marks: 4, 5, or 6 (ensuring Module 1 = 10M, Module 2 = {total_marks - 10}M)\n"
            f"- options: null\n"
            f"- correct_answer: Concise model answer with key equations, definitions, or algorithms (2-3 sentences)\n"
            f"- explanation: Step-wise evaluation marking breakdown (e.g., '2 Marks definition, 3 Marks derivation')\n"
            f"- topic: Specific topic name\n\n"
            f"Ensure total marks across all questions sum to EXACTLY {total_marks} Marks."
        )
    elif exam_type == "end_term":
        total_marks = 50
        duration_minutes = body.duration_minutes if body.duration_minutes != 60 else 120
        max_gen_tokens = 3500
        prompt_exam_pattern = (
            f"EXAM TYPE: COMPREHENSIVE UNIVERSITY END-TERM EXAMINATION (Total Marks: 50, Duration: {duration_minutes} Minutes).\n\n"
            f"STRICT EXAMINATION PATTERN (NO MULTIPLE CHOICE QUESTIONS):\n"
            f"- Strictly ZERO Multiple Choice Questions (MCQs). All questions MUST be descriptive/analytical engineering questions (type: 'descriptive').\n"
            f"- EXACTLY 10 MARKS MAXIMUM PER MODULE ACROSS ALL 5 MODULES (5 Modules x 10 Marks = 50 Marks Total):\n"
            f"  DO NOT give a single 10-Mark question. Every module MUST be split into 2 sub-questions totaling 10 Marks (either [5 Marks + 5 Marks] or [4 Marks + 6 Marks]):\n"
            f"  * Module 1 (10 Marks): Exactly 2 sub-questions: [Q1(a) (5M or 4M), Q1(b) (5M or 6M)].\n"
            f"  * Module 2 (10 Marks): Exactly 2 sub-questions: [Q2(a) (5M or 4M), Q2(b) (5M or 6M)].\n"
            f"  * Module 3 (10 Marks): Exactly 2 sub-questions: [Q3(a) (5M or 4M), Q3(b) (5M or 6M)].\n"
            f"  * Module 4 (10 Marks): Exactly 2 sub-questions: [Q4(a) (5M or 4M), Q4(b) (5M or 6M)].\n"
            f"  * Module 5 (10 Marks): Exactly 2 sub-questions: [Q5(a) (5M or 4M), Q5(b) (5M or 6M)].\n\n"
            f"Total = Exactly 10 sub-questions (2 sub-questions per module x 5 modules).\n"
            f"Requirements for each question:\n"
            f"- question_number: sequential integer (1 to 10)\n"
            f"- sub_question_label: 'Q1(a)', 'Q1(b)', 'Q2(a)', 'Q2(b)', 'Q3(a)', 'Q3(b)', 'Q4(a)', 'Q4(b)', 'Q5(a)', 'Q5(b)'\n"
            f"- module_number: 1, 2, 3, 4, or 5\n"
            f"- question_text: Descriptive engineering question\n"
            f"- type: 'descriptive'\n"
            f"- marks: 4, 5, or 6 (ensuring each module sums to exactly 10 Marks)\n"
            f"- options: null\n"
            f"- correct_answer: Concise model answer (1-2 sentences, max 30 words)\n"
            f"- explanation: Concise step-wise marking rubric (1 sentence, max 15 words)\n"
            f"- topic: Specific module topic name\n\n"
            f"Ensure total marks across all 10 sub-questions sum to EXACTLY 50 Marks."
        )
    else:
        total_marks = body.total_marks
        duration_minutes = body.duration_minutes
        max_gen_tokens = 2048
        mcq_count = body.mcq_count
        short_answer_count = body.short_answer_count
        prompt_exam_pattern = (
            f"Practice Paper ({total_marks} Marks, {duration_minutes} mins).\n"
            f"- Exactly {mcq_count} Multiple Choice Questions (type: 'mcq'), with 4 choices in 'options', correct_answer index, and explanation.\n"
            f"- Exactly {short_answer_count} Short Answer Questions (type: 'short_answer'), with model answer and explanation."
        )

    # Fetch modules and resources for multi-document context aggregation
    q_mod = select(CourseModule).where(CourseModule.course_id == body.course_id)
    if body.module_ids:
        q_mod = q_mod.where(CourseModule.id.in_(body.module_ids))
    modules_list = (await db.execute(q_mod.order_by(CourseModule.order_index))).scalars().all()

    q_res = select(LearningResource).where(LearningResource.course_id == body.course_id)
    if body.module_ids:
        q_res = q_res.where(LearningResource.module_id.in_(body.module_ids))
    res_list = (await db.execute(q_res)).scalars().all()

    context_str = build_multi_document_context(
        resources=res_list,
        modules=modules_list,
        max_total_chars=3500,
    )

    prompt = (
        f"You are a university examination board paper setter for course: '{course.title}' ({course.code or ''}).\n"
        f"Paper Title: {body.title}\n"
        f"{prompt_exam_pattern}\n\n"
        f"Difficulty level: {body.difficulty}.\n"
        f"Output NO internal reasoning or think tags. Output ONLY the valid JSON.\n\n"
        f"Multi-Document Learning Context:\n{context_str}"
    )

    try:
        paper_result, _ = await ai_manager.generate_structured(
            task=AITask.SAMPLE_PAPER_GENERATION,
            prompt=prompt,
            schema=AIGeneratedPaperResult,
            db=db,
            temperature=0.2,
            max_tokens=max_gen_tokens,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI Practice Paper Generation failed: {e}") from e

    paper = PracticePaper(
        id=str(uuid.uuid4()),
        student_id=current_user.id,
        course_id=body.course_id,
        title=body.title,
        description=body.description or paper_result.description,
        total_marks=total_marks,
        duration_minutes=duration_minutes,
        difficulty=body.difficulty,
        status="available",
        source="ai",
        config_json=json.dumps({"exam_type": exam_type, "module_ids": body.module_ids}),
    )
    db.add(paper)
    await db.flush()

    for idx, q_data in enumerate(paper_result.questions, start=1):
        q_text = q_data.question_text
        if q_data.sub_question_label and not q_text.startswith(q_data.sub_question_label):
            q_text = f"{q_data.sub_question_label} [{q_data.marks}M]: {q_text}"

        q = PracticeQuestion(
            id=str(uuid.uuid4()),
            paper_id=paper.id,
            question_number=idx,
            question_text=q_text,
            question_type=q_data.type if q_data.type in ("mcq", "short_answer", "descriptive") else "descriptive",
            marks=q_data.marks,
            options_json=json.dumps(q_data.options) if q_data.options else None,
            correct_answer=str(q_data.correct_answer or ""),
            explanation=q_data.explanation or "",
            topic=q_data.topic or f"Module {q_data.module_number}",
            difficulty=q_data.difficulty or "medium",
        )
        db.add(q)

    await db.commit()

    # Re-fetch
    query = (
        select(PracticePaper)
        .options(selectinload(PracticePaper.questions), selectinload(PracticePaper.attempts))
        .where(PracticePaper.id == paper.id)
    )
    res = await db.execute(query)
    saved = res.scalar_one()
    return _format_paper(saved, current_user.id)


@router.post("/practice-papers", response_model=PracticePaperResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_practice_paper(
    body: PracticePaperCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PracticePaperResponse:
    course = await db.get(Course, body.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    paper = PracticePaper(
        id=str(uuid.uuid4()),
        student_id=current_user.id,
        course_id=body.course_id,
        title=body.title,
        description=body.description,
        total_marks=body.total_marks,
        duration_minutes=body.duration_minutes,
        difficulty=body.difficulty,
        status="available",
        source="custom",
    )
    db.add(paper)
    await db.flush()

    for idx, q_data in enumerate(body.questions, start=1):
        q = PracticeQuestion(
            id=str(uuid.uuid4()),
            paper_id=paper.id,
            question_number=q_data.question_number or idx,
            question_text=q_data.question_text,
            question_type=q_data.question_type,
            marks=q_data.marks,
            options_json=json.dumps(q_data.options) if q_data.options else None,
            correct_answer=q_data.correct_answer,
            explanation=q_data.explanation,
            topic=q_data.topic,
            difficulty=q_data.difficulty,
        )
        db.add(q)

    await db.commit()

    query = (
        select(PracticePaper)
        .options(selectinload(PracticePaper.questions), selectinload(PracticePaper.attempts))
        .where(PracticePaper.id == paper.id)
    )
    res = await db.execute(query)
    saved = res.scalar_one()
    return _format_paper(saved, current_user.id)


@router.get("/practice-papers/{paper_id}", response_model=PracticePaperResponse)
async def get_practice_paper(
    paper_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PracticePaperResponse:
    query = (
        select(PracticePaper)
        .options(selectinload(PracticePaper.questions), selectinload(PracticePaper.attempts))
        .where(PracticePaper.id == paper_id)
    )
    res = await db.execute(query)
    paper = res.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Practice paper not found")
    return _format_paper(paper, current_user.id)


@router.delete("/practice-papers/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_practice_paper(
    paper_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    paper = await db.get(PracticePaper, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Practice paper not found")
    if current_user.role != "admin" and paper.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this practice paper")

    await db.delete(paper)
    await db.commit()


# ── Attempt Submission & Scoring ─────────────────────────────────────────────

@router.post("/practice-papers/{paper_id}/submit", response_model=PracticeAttemptResponse)
async def submit_practice_attempt(
    paper_id: str,
    body: SubmitPracticeAttemptRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> PracticeAttemptResponse:
    query = (
        select(PracticePaper)
        .options(selectinload(PracticePaper.questions))
        .where(PracticePaper.id == paper_id)
    )
    res = await db.execute(query)
    paper = res.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Practice paper not found")

    score: float = 0.0
    total_marks = paper.total_marks or sum(q.marks for q in paper.questions)
    topic_breakdown: list[dict[str, Any]] = []

    for q in paper.questions:
        user_ans = body.answers.get(q.id)
        q_score = 0.0

        if user_ans is not None:
            user_str = str(user_ans).strip().lower()
            correct_str = str(q.correct_answer).strip().lower()

            if q.question_type == "mcq":
                # Check option index or direct match
                options = json.loads(q.options_json) if q.options_json else []
                is_correct = False
                if user_str == correct_str:
                    is_correct = True
                elif user_str.isdigit() and int(user_str) < len(options):
                    if options[int(user_str)].strip().lower() == correct_str:
                        is_correct = True
                if is_correct:
                    q_score = float(q.marks)
            else:
                # Short answer comparison
                if len(user_str) > 0 and (user_str in correct_str or correct_str in user_str):
                    q_score = float(q.marks)
                elif len(user_str) > 0:
                    q_score = round(q.marks * 0.5, 1)

        score += q_score
        topic_breakdown.append({
            "topic": q.topic or f"Question {q.question_number}",
            "score": q_score,
            "total": float(q.marks),
        })

    percentage = round((score / total_marks) * 100, 1) if total_marks > 0 else 0.0
    now = datetime.now(timezone.utc)

    attempt = PracticeAttempt(
        id=str(uuid.uuid4()),
        paper_id=paper.id,
        student_id=current_user.id,
        answers_json=json.dumps(body.answers),
        score=score,
        total_marks=total_marks,
        percentage=percentage,
        topic_breakdown_json=json.dumps(topic_breakdown),
        started_at=now,
        submitted_at=now,
        status="submitted",
    )
    db.add(attempt)
    paper.status = "submitted"
    await db.commit()

    return _format_attempt(attempt)


# ── Analytics ────────────────────────────────────────────────────────────────

@router.get("/analytics/student", response_model=StudentAnalyticsResponse)
async def get_student_analytics(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> StudentAnalyticsResponse:
    # Fetch all attempts by student
    att_res = await db.execute(
        select(PracticeAttempt)
        .options(selectinload(PracticeAttempt.paper))
        .where(PracticeAttempt.student_id == current_user.id)
        .order_by(PracticeAttempt.created_at.desc())
    )
    attempts = att_res.scalars().all()

    # Mastered notebooks (progress >= 75%)
    nb_res = await db.execute(
        select(func.count(SubjectNotebook.id)).where(
            SubjectNotebook.student_id == current_user.id,
            SubjectNotebook.progress_percent >= 75.0,
        )
    )
    mastered_count = nb_res.scalar() or 0

    total_attempts = len(attempts)
    avg_score = round(sum(a.percentage or 0 for a in attempts) / total_attempts, 1) if total_attempts > 0 else 0.0

    recent_attempts_list = []
    topic_scores: dict[str, list[float]] = {}

    for a in attempts[:10]:
        title = a.paper.title if a.paper else "Practice Paper"
        breakdown = json.loads(a.topic_breakdown_json) if a.topic_breakdown_json else []
        recent_attempts_list.append({
            "id": a.id,
            "title": title,
            "date": a.submitted_at.strftime("%Y-%m-%d") if a.submitted_at else "",
            "score": a.score or 0.0,
            "total": a.total_marks or 0,
            "percentage": a.percentage or 0.0,
            "topicBreakdown": breakdown,
        })
        for item in breakdown:
            topic = item.get("topic", "General")
            t_score = item.get("score", 0)
            t_total = item.get("total", 1)
            percent = (t_score / t_total) * 100 if t_total > 0 else 0
            topic_scores.setdefault(topic, []).append(percent)

    topic_mastery = [
        {"topic": topic, "mastery": round(sum(scores) / len(scores), 1)}
        for topic, scores in topic_scores.items()
    ]

    return StudentAnalyticsResponse(
        total_attempts=total_attempts,
        average_score_percent=avg_score,
        total_practice_questions=sum(len(json.loads(a.answers_json or "{}")) for a in attempts),
        total_hours_spent=round(total_attempts * 0.75, 1),
        mastered_notebooks_count=mastered_count,
        recent_attempts=recent_attempts_list,
        topic_mastery=topic_mastery,
    )


@router.get("/analytics/performance-prediction")
@router.get("/performance-prediction")
async def get_performance_prediction(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Supervised Machine Learning performance prediction and academic risk tier classification.
    """
    att_res = await db.execute(
        select(PracticeAttempt).where(PracticeAttempt.student_id == current_user.id)
    )
    attempts = att_res.scalars().all()

    nb_res = await db.execute(
        select(func.count(SubjectNotebook.id)).where(
            SubjectNotebook.student_id == current_user.id
        )
    )
    nb_count = nb_res.scalar() or 0

    total_attempts = len(attempts)
    avg_score = (sum(a.percentage or 0.0 for a in attempts) / total_attempts) if total_attempts > 0 else 70.0

    weak_count = 0
    for a in attempts:
        breakdown = json.loads(a.topic_breakdown_json or "[]")
        for item in breakdown:
            t_score = item.get("score", 0)
            t_total = item.get("total", 1)
            if t_total > 0 and (t_score / t_total) < 0.5:
                weak_count += 1

    features = StudentFeatureVector(
        practice_attempts_count=total_attempts,
        practice_average_percentage=avg_score,
        weak_topics_count=min(5, weak_count),
        study_notebook_pages=nb_count * 2,
        completion_velocity_ratio=0.95,
    )
    return predict_student_performance(features)
