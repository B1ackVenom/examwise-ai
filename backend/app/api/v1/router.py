from fastapi import APIRouter

from app.api.v1.endpoints import (
    ai_admin,
    audit,
    auth,
    courses,
    evaluation,
    exams,
    marksheets,
    notebooks,
    practice,
    questions,
    study_assistant,
    submissions,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(courses.router, prefix="/courses", tags=["Courses & Academic"])
api_router.include_router(notebooks.router, prefix="/notebooks", tags=["Notebooks & Cornell Notes"])
api_router.include_router(questions.router, prefix="/questions", tags=["Important Questions & AI Prediction"])
api_router.include_router(practice.router, tags=["Practice Papers & Analytics"])
api_router.include_router(study_assistant.router, prefix="/study-assistant", tags=["AI Study Assistant"])
api_router.include_router(ai_admin.router, prefix="/admin/ai", tags=["Admin AI Management"])
api_router.include_router(exams.router, prefix="/exams", tags=["Examinations"])
api_router.include_router(submissions.router, tags=["Submissions"])
api_router.include_router(evaluation.router, tags=["Teacher Evaluation & AI Grading"])
api_router.include_router(marksheets.router, tags=["Marksheets & Published Results"])
api_router.include_router(audit.router, tags=["Audit Trail"])
