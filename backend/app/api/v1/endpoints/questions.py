from __future__ import annotations

import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db, require_teacher
from app.models.course import Course, CourseModule, LearningResource
from app.models.question import ImportantQuestion, StudentQuestionBookmark
from app.models.user import User
from app.schemas.question import (
    BookmarkRequest,
    BookmarkResponse,
    ImportantQuestionCreate,
    ImportantQuestionResponse,
    PredictQuestionsRequest,
)
from app.services.ai.base import AITask
from app.services.ai.manager import ai_manager
from app.services.aiml_engine import classify_blooms_taxonomy
from app.services.document_context import build_multi_document_context

router = APIRouter()


class AIPredictedItem(BaseModel):
    question: str
    marks: int = 5
    difficulty: str = "medium"  # easy | medium | hard
    importance_rating: str = "High"  # Very High | High | Medium
    frequency_score: int = 2
    blooms_taxonomy: str = "Understand"  # Remember | Understand | Apply | Analyze | Evaluate
    expected_key_points: list[str] = []
    model_answer: str = ""
    confidence_label: str = "High confidence based on syllabus frequency"


class AIPredictionResult(BaseModel):
    questions: list[AIPredictedItem]


def _format_question(q: ImportantQuestion, bookmarked_ids: set[str]) -> ImportantQuestionResponse:
    key_points = json.loads(q.expected_key_points_json) if q.expected_key_points_json else []
    sources = json.loads(q.source_resource_ids) if q.source_resource_ids else []
    return ImportantQuestionResponse(
        id=q.id,
        courseId=q.course_id,
        moduleId=q.module_id or "",
        question=q.question_text,
        marks=q.marks or 5,
        difficulty=q.difficulty,
        importanceRating=q.importance_rating,
        frequencyScore=q.frequency_score,
        bloomsTaxonomy=q.blooms_taxonomy,
        sourceResources=sources,
        expectedKeyPoints=key_points,
        modelAnswer=q.model_answer or "",
        isBookmarked=q.id in bookmarked_ids,
        confidenceLabel=q.confidence_label,
    )


@router.get("", response_model=list[ImportantQuestionResponse])
async def list_questions(
    current_user: CurrentUser,
    course_id: str | None = Query(default=None),
    module_id: str | None = Query(default=None),
    difficulty: str | None = Query(default=None),
    bookmarked_only: bool = Query(default=False),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[ImportantQuestionResponse]:
    # 1. Fetch user bookmarks
    bm_res = await db.execute(
        select(StudentQuestionBookmark.question_id).where(
            StudentQuestionBookmark.student_id == current_user.id
        )
    )
    bookmarked_ids = set(bm_res.scalars().all())

    # 2. Build question query
    query = select(ImportantQuestion).order_by(ImportantQuestion.priority_score.desc())
    if course_id and course_id != "all":
        query = query.where(ImportantQuestion.course_id == course_id)
    if module_id and module_id != "all":
        query = query.where(ImportantQuestion.module_id == module_id)
    if difficulty and difficulty != "all":
        query = query.where(ImportantQuestion.difficulty == difficulty)
    if bookmarked_only:
        query = query.where(ImportantQuestion.id.in_(bookmarked_ids))

    result = await db.execute(query)
    questions = result.scalars().all()

    response = []
    for q in questions:
        if search:
            s = search.lower()
            q_match = s in q.question_text.lower()
            a_match = bool(q.model_answer and s in q.model_answer.lower())
            if not (q_match or a_match):
                continue
        response.append(_format_question(q, bookmarked_ids))
    return response


@router.post("/predict", response_model=list[ImportantQuestionResponse])
async def predict_questions(
    body: PredictQuestionsRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ImportantQuestionResponse]:
    course = await db.get(Course, body.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Fetch modules and resources for multi-document context aggregation
    q_mod = select(CourseModule).where(CourseModule.course_id == body.course_id)
    if body.module_id:
        q_mod = q_mod.where(CourseModule.id == body.module_id)
    modules_list = (await db.execute(q_mod.order_by(CourseModule.order_index))).scalars().all()

    query_res = select(LearningResource).where(LearningResource.course_id == body.course_id)
    if body.module_id:
        query_res = query_res.where(LearningResource.module_id == body.module_id)
    res_list = (await db.execute(query_res)).scalars().all()

    module_title = modules_list[0].title if modules_list else "General Course Content"
    context_str = build_multi_document_context(
        resources=res_list,
        modules=modules_list,
        max_total_chars=3500,
    )

    prompt = (
        f"You are an expert exam analyzer for the university course: '{course.title}' ({course.code or ''}).\n"
        f"Target Module: {module_title}\n"
        f"Focus topic: {body.focus_topic or 'Core examination concepts'}\n"
        f"Generate {body.count} high-priority, recurring important exam questions.\n"
        f"Difficulty: {body.difficulty or 'mixed (easy, medium, hard)'}\n\n"
        f"Multi-Document Learning Context:\n{context_str}\n\n"
        f"For each question, predict the importance rating (Very High, High, Medium), "
        f"estimated marks (e.g. 5, 8, or 10), Bloom's taxonomy level (Remember, Understand, Apply, Analyze, Evaluate), "
        f"expected key points, and a concise model answer.\n"
        f"Output NO internal reasoning or think tags. Output ONLY the valid JSON."
    )

    try:
        prediction_result, _ = await ai_manager.generate_structured(
            task=AITask.QUESTION_PREDICTION,
            prompt=prompt,
            schema=AIPredictionResult,
            db=db,
            temperature=0.2,
            max_tokens=2048,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI Question Prediction failed: {e}") from e

    # Fetch bookmarks for user
    bm_res = await db.execute(
        select(StudentQuestionBookmark.question_id).where(
            StudentQuestionBookmark.student_id == current_user.id
        )
    )
    bookmarked_ids = set(bm_res.scalars().all())

    created_questions = []
    for item in prediction_result.questions:
        iq = ImportantQuestion(
            id=str(uuid.uuid4()),
            course_id=body.course_id,
            module_id=body.module_id,
            question_text=item.question,
            marks=item.marks,
            difficulty=item.difficulty.lower(),
            importance_rating=item.importance_rating,
            frequency_score=item.frequency_score,
            blooms_taxonomy=item.blooms_taxonomy or classify_blooms_taxonomy(item.question)["blooms_level"],
            priority_score=0.8 if item.importance_rating == "Very High" else 0.6,
            source="ai",
            expected_key_points_json=json.dumps(item.expected_key_points) if item.expected_key_points else None,
            model_answer=item.model_answer,
            confidence_label=item.confidence_label,
            source_resource_ids=json.dumps([r.id for r in res_list[:3]]) if res_list else None,
        )
        db.add(iq)
        created_questions.append(iq)

    await db.commit()
    return [_format_question(q, bookmarked_ids) for q in created_questions]


@router.post("", response_model=ImportantQuestionResponse, status_code=status.HTTP_201_CREATED)
async def create_question(
    body: ImportantQuestionCreate,
    current_user: Annotated[User, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> ImportantQuestionResponse:
    course = await db.get(Course, body.course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    q = ImportantQuestion(
        id=str(uuid.uuid4()),
        course_id=body.course_id,
        module_id=body.module_id,
        question_text=body.question,
        marks=body.marks,
        difficulty=body.difficulty.lower(),
        importance_rating=body.importance_rating,
        frequency_score=body.frequency_score,
        blooms_taxonomy=body.blooms_taxonomy,
        priority_score=0.9,
        source="teacher",
        expected_key_points_json=json.dumps(body.expected_key_points) if body.expected_key_points else None,
        model_answer=body.model_answer,
        confidence_label=body.confidence_label,
        source_resource_ids=json.dumps(body.source_resources) if body.source_resources else None,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return _format_question(q, set())


# ── Bookmarks ───────────────────────────────────────────────────────────────

@router.post("/{question_id}/bookmark")
async def toggle_bookmark(
    question_id: str,
    current_user: CurrentUser,
    body: BookmarkRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    q = await db.get(ImportantQuestion, question_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    result = await db.execute(
        select(StudentQuestionBookmark).where(
            StudentQuestionBookmark.student_id == current_user.id,
            StudentQuestionBookmark.question_id == question_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"question_id": question_id, "is_bookmarked": False, "message": "Bookmark removed"}
    else:
        bm = StudentQuestionBookmark(
            id=str(uuid.uuid4()),
            student_id=current_user.id,
            question_id=question_id,
            notes=body.notes if body else None,
        )
        db.add(bm)
        await db.commit()
        return {"question_id": question_id, "is_bookmarked": True, "message": "Bookmark added"}


@router.delete("/{question_id}/bookmark", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    question_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(StudentQuestionBookmark).where(
            StudentQuestionBookmark.student_id == current_user.id,
            StudentQuestionBookmark.question_id == question_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()


@router.get("/bookmarks", response_model=list[ImportantQuestionResponse])
async def list_bookmarks(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ImportantQuestionResponse]:
    bm_res = await db.execute(
        select(StudentQuestionBookmark.question_id).where(
            StudentQuestionBookmark.student_id == current_user.id
        )
    )
    bookmarked_ids = set(bm_res.scalars().all())
    if not bookmarked_ids:
        return []

    q_res = await db.execute(
        select(ImportantQuestion).where(ImportantQuestion.id.in_(bookmarked_ids))
    )
    questions = q_res.scalars().all()
    return [_format_question(q, bookmarked_ids) for q in questions]
