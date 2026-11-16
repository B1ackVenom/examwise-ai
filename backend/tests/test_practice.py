from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.api.v1.endpoints.practice import AIGeneratedPaperResult, AIGeneratedQuestionItem
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


class TestPracticePapers:
    async def test_custom_practice_paper_and_attempt_scoring(self, client: AsyncClient):
        student_token = await _signup_and_get_token(client, "student_prac@test.com", "student")
        teacher_token = await _signup_and_get_token(client, "teacher_prac@test.com", "teacher")

        # Create course
        c_resp = await client.post(
            "/api/v1/courses",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"title": "Software Engineering", "code": "SE101"},
        )
        course_id = c_resp.json()["id"]

        # Student creates custom practice paper
        paper_resp = await client.post(
            "/api/v1/practice-papers",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "course_id": course_id,
                "title": "SE Midterm Prep",
                "duration_minutes": 45,
                "total_marks": 10,
                "difficulty": "medium",
                "questions": [
                    {
                        "question_number": 1,
                        "question_text": "Which model is best for projects with unclear requirements?",
                        "question_type": "mcq",
                        "marks": 5,
                        "options": ["Waterfall", "Agile", "Spiral", "V-Model"],
                        "correct_answer": "1",  # Agile index
                        "explanation": "Agile emphasizes iteration and adaptable requirements.",
                    },
                    {
                        "question_number": 2,
                        "question_text": "What does DRY stand for in software engineering?",
                        "question_type": "short_answer",
                        "marks": 5,
                        "correct_answer": "Don't Repeat Yourself",
                        "explanation": "DRY aims to reduce duplication of software patterns.",
                    },
                ],
            },
        )
        assert paper_resp.status_code == 201
        paper = paper_resp.json()
        assert paper["title"] == "SE Midterm Prep"
        assert len(paper["questions"]) == 2
        paper_id = paper["id"]
        q1_id = paper["questions"][0]["id"]
        q2_id = paper["questions"][1]["id"]

        # Student submits attempt
        attempt_resp = await client.post(
            f"/api/v1/practice-papers/{paper_id}/submit",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "answers": {
                    q1_id: "1",  # Correct MCQ
                    q2_id: "Don't Repeat Yourself",  # Correct short answer
                }
            },
        )
        assert attempt_resp.status_code == 200
        attempt = attempt_resp.json()
        assert attempt["score"] == 10.0
        assert attempt["percentage"] == 100.0
        assert len(attempt["topicBreakdown"]) == 2

        # Check analytics
        analytics_resp = await client.get(
            "/api/v1/analytics/student",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert analytics_resp.status_code == 200
        stats = analytics_resp.json()
        assert stats["total_attempts"] >= 1
        assert stats["average_score_percent"] == 100.0

    async def test_ai_generate_practice_paper(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "prof_gen_p@test.com", "teacher")
        student_token = await _signup_and_get_token(client, "stud_gen_p@test.com", "student")

        c_resp = await client.post(
            "/api/v1/courses",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"title": "Artificial Intelligence", "code": "AI401"},
        )
        course_id = c_resp.json()["id"]

        mock_paper = AIGeneratedPaperResult(
            title="AI Search Algorithms Practice",
            description="Practice paper covering BFS, DFS, and A*",
            duration_minutes=60,
            total_marks=20,
            difficulty="medium",
            questions=[
                AIGeneratedQuestionItem(
                    question_number=1,
                    question_text="Which algorithm is guaranteed to find the shortest path in unweighted graphs?",
                    type="mcq",
                    marks=10,
                    options=["DFS", "BFS", "Depth-limited Search", "Greedy Search"],
                    correct_answer="1",
                    explanation="BFS expands nodes layer-by-layer.",
                    topic="Search Algorithms",
                ),
                AIGeneratedQuestionItem(
                    question_number=2,
                    question_text="State the condition for an A* heuristic to be admissible.",
                    type="short_answer",
                    marks=10,
                    correct_answer="Never overestimate the true cost to reach the goal",
                    explanation="h(n) <= h*(n)",
                    topic="Heuristic Search",
                ),
            ],
        )

        with patch.object(
            AIProviderManager,
            "generate_structured",
            new_callable=AsyncMock,
            return_value=(
                mock_paper,
                AIResponse(raw_text="mock", model_name="qwen3:1.7b", provider_type="ollama"),
            ),
        ):
            gen_resp = await client.post(
                "/api/v1/practice-papers/generate",
                headers={"Authorization": f"Bearer {student_token}"},
                json={
                    "course_id": course_id,
                    "title": "AI Search Algorithms Practice",
                    "mcq_count": 1,
                    "short_answer_count": 1,
                },
            )
            assert gen_resp.status_code == 201
            p_data = gen_resp.json()
            assert p_data["title"] == "AI Search Algorithms Practice"
            assert len(p_data["questions"]) == 2


class TestStudyAssistant:
    async def test_ask_study_assistant(self, client: AsyncClient):
        student_token = await _signup_and_get_token(client, "stud_assist@test.com", "student")

        with patch.object(
            AIProviderManager,
            "generate",
            new_callable=AsyncMock,
            return_value=AIResponse(
                raw_text="Dynamic programming solves subproblems once and stores solutions.",
                model_name="qwen3:1.7b",
                provider_type="ollama",
            ),
        ):
            resp = await client.post(
                "/api/v1/study-assistant/ask",
                headers={"Authorization": f"Bearer {student_token}"},
                json={"question": "What is the core principle of dynamic programming?"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "Dynamic programming" in data["answer"]
            assert data["model_used"] == "qwen3:1.7b"
