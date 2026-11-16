from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db
from app.models.course import Course, LearningResource
from app.services.ai.base import AITask
from app.services.ai.manager import ai_manager

router = APIRouter()


class StudyAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    course_id: str | None = None
    module_id: str | None = None
    user_notes: str | None = None


class StudyAskResponse(BaseModel):
    answer: str
    model_used: str
    provider_type: str


@router.post("/ask", response_model=StudyAskResponse)
async def ask_study_assistant(
    body: StudyAskRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> StudyAskResponse:
    context_parts = []
    if body.course_id:
        course = await db.get(Course, body.course_id)
        if course:
            context_parts.append(f"Course: {course.title} ({course.code or ''})")

    if body.user_notes:
        context_parts.append(f"Student's Cornell Notes Context:\n{body.user_notes[:1000]}")

    context_str = "\n".join(context_parts) if context_parts else "General academic subjects"

    prompt = (
        f"You are ExamWise AI's academic study assistant, helping a student master course concepts.\n"
        f"Context:\n{context_str}\n\n"
        f"Student question:\n{body.question}\n\n"
        f"Provide a clear, pedagogical, concise explanation with key takeaways, formulas, or bullet points."
    )

    try:
        response = await ai_manager.generate(
            task=AITask.STUDY_ASSISTANCE,
            prompt=prompt,
            db=db,
            temperature=0.3,
        )
        return StudyAskResponse(
            answer=response.raw_text,
            model_used=response.model_name,
            provider_type=response.provider_type,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Study assistant error: {e}") from e
