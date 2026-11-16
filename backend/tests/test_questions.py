from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.api.v1.endpoints.questions import AIPredictedItem, AIPredictionResult
from app.services.ai.base import AIResponse
from app.services.ai.manager import AIProviderManager


async def _signup_and_get_token(client: AsyncClient, email: str, role: str) -> str:
    resp = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": f"{role.capitalize()} User",
            "role": role,
        },
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


class TestImportantQuestions:
    async def test_manual_question_creation_and_listing(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "prof_q@test.com", "teacher")
        student_token = await _signup_and_get_token(client, "stud_q@test.com", "student")

        # Create course
        c_resp = await client.post(
            "/api/v1/courses",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"title": "Discrete Math", "code": "MATH201"},
        )
        course_id = c_resp.json()["id"]

        # Teacher adds important question
        q_resp = await client.post(
            "/api/v1/questions",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "course_id": course_id,
                "question": "State and prove Pigeonhole Principle.",
                "marks": 6,
                "difficulty": "medium",
                "importance_rating": "Very High",
                "frequency_score": 3,
                "blooms_taxonomy": "Apply",
                "expected_key_points": ["Pigeons and holes", "Floor function formulation"],
                "model_answer": "If n items are put into m containers, with n > m, then at least one container has > 1 item.",
            },
        )
        assert q_resp.status_code == 201
        q_data = q_resp.json()
        assert q_data["question"] == "State and prove Pigeonhole Principle."
        assert q_data["importanceRating"] == "Very High"
        q_id = q_data["id"]

        # Student lists questions
        list_resp = await client.get(
            f"/api/v1/questions?course_id={course_id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert list_resp.status_code == 200
        assert len(list_resp.json()) == 1
        assert list_resp.json()[0]["isBookmarked"] is False

        # Student bookmarks question
        bm_resp = await client.post(
            f"/api/v1/questions/{q_id}/bookmark",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"notes": "Must revise before midterms"},
        )
        assert bm_resp.status_code == 200
        assert bm_resp.json()["is_bookmarked"] is True

        # Now question isBookmarked is True
        list_after = await client.get(
            f"/api/v1/questions?course_id={course_id}&bookmarked_only=true",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert list_after.status_code == 200
        assert len(list_after.json()) == 1
        assert list_after.json()[0]["isBookmarked"] is True

        # Student removes bookmark
        unbm = await client.post(
            f"/api/v1/questions/{q_id}/bookmark",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert unbm.status_code == 200
        assert unbm.json()["is_bookmarked"] is False

    async def test_ai_question_prediction(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "prof_pred@test.com", "teacher")
        student_token = await _signup_and_get_token(client, "stud_pred@test.com", "student")

        # Create course
        c_resp = await client.post(
            "/api/v1/courses",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"title": "Database Systems", "code": "CS302"},
        )
        course_id = c_resp.json()["id"]

        # Mock AI prediction response
        mock_result = AIPredictionResult(
            questions=[
                AIPredictedItem(
                    question="Explain B+ Tree indexing and its advantages over B Tree.",
                    marks=8,
                    difficulty="hard",
                    importance_rating="Very High",
                    frequency_score=4,
                    blooms_taxonomy="Analyze",
                    expected_key_points=["All data in leaf nodes", "Sequential access via linked leaves"],
                    model_answer="B+ trees keep records solely in leaves...",
                    confidence_label="Predicted from recurring exam pattern",
                ),
                AIPredictedItem(
                    question="Define 3NF and BCNF with examples.",
                    marks=6,
                    difficulty="medium",
                    importance_rating="High",
                    frequency_score=3,
                    blooms_taxonomy="Understand",
                    expected_key_points=["Functional dependencies", "Superkey requirement"],
                    model_answer="BCNF removes all non-trivial functional dependencies...",
                ),
            ]
        )

        with patch.object(
            AIProviderManager,
            "generate_structured",
            new_callable=AsyncMock,
            return_value=(
                mock_result,
                AIResponse(raw_text="mock", model_name="qwen3:1.7b", provider_type="ollama"),
            ),
        ):
            pred_resp = await client.post(
                "/api/v1/questions/predict",
                headers={"Authorization": f"Bearer {student_token}"},
                json={"course_id": course_id, "count": 2},
            )
            assert pred_resp.status_code == 200
            data = pred_resp.json()
            assert len(data) == 2
            assert data[0]["question"] == "Explain B+ Tree indexing and its advantages over B Tree."
            assert data[0]["difficulty"] == "hard"
            assert data[0]["importanceRating"] == "Very High"
