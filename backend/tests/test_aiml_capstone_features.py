from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.services.aiml_engine import (
    StudentFeatureVector,
    classify_blooms_taxonomy,
    compute_concept_recall,
    compute_hybrid_evaluation_score,
    compute_vector_cosine_similarity,
    predict_student_performance,
)


class TestAIMLCapstoneEngine:
    def test_cosine_similarity_calculation(self):
        student = "Dijkstra algorithm uses a priority queue to select minimum distance vertices with non-negative edge weights."
        model = "Dijkstras algorithm finds single-source shortest paths on weighted graphs using a greedy priority queue for non-negative weights."
        similarity = compute_vector_cosine_similarity(student, model)
        assert similarity >= 0.45, f"Expected cosine similarity >= 0.45, got {similarity}"

        unrelated = "Relational databases use B+ trees for indexing and ACID transactions for concurrency control."
        unrelated_sim = compute_vector_cosine_similarity(student, unrelated)
        assert unrelated_sim < similarity, "Unrelated topic must have lower cosine similarity"

    def test_concept_coverage_recall(self):
        student = "Dijkstra algorithm uses a priority queue to greedily select vertices with non-negative edge weights."
        expected_concepts = [
            "priority queue",
            "greedy approach",
            "non-negative edge weights",
            "time complexity O(V log V)",
        ]
        recall, matched, missing = compute_concept_recall(student, expected_concepts)
        assert recall >= 0.50
        assert "priority queue" in matched
        assert "non-negative edge weights" in matched

    def test_hybrid_dual_engine_grading(self):
        student = "Dijkstra algorithm uses a priority queue to greedily select vertices with non-negative edge weights."
        model = "Dijkstras algorithm finds single-source shortest paths on weighted graphs using a greedy approach."
        expected_concepts = ["priority queue", "greedy approach", "non-negative edge weights"]

        result = compute_hybrid_evaluation_score(
            max_marks=5.0,
            ai_proposed_marks=4.0,
            student_text=student,
            model_answer=model,
            key_concepts=expected_concepts,
        )

        assert 0.0 <= result["recommended_hybrid_marks"] <= 5.0
        assert "cosine_similarity" in result
        assert "concept_recall" in result
        assert "confidence_index" in result

    def test_blooms_taxonomy_cognitive_classifier(self):
        q1 = classify_blooms_taxonomy("Define asymptotic notations and state Big-O properties.")
        assert q1["blooms_level"] == "Remember"
        assert q1["is_higher_order_thinking"] is False

        q2 = classify_blooms_taxonomy("Analyze the average-case and worst-case time complexities of Quicksort.")
        assert q2["blooms_level"] == "Analyze"
        assert q2["is_higher_order_thinking"] is True

        q3 = classify_blooms_taxonomy("Design and synthesize an optimal schedule for job sequencing with deadlines.")
        assert q3["blooms_level"] == "Create"
        assert q3["is_higher_order_thinking"] is True

    def test_supervised_student_performance_forecaster(self):
        # Case A: Exam Ready
        vector_strong = StudentFeatureVector(
            practice_attempts_count=6,
            practice_average_percentage=85.0,
            weak_topics_count=0,
            study_notebook_pages=10,
            completion_velocity_ratio=0.9,
        )
        pred_strong = predict_student_performance(vector_strong)
        assert pred_strong["risk_tier"] == "EXAM_READY"
        assert pred_strong["predicted_percentage"] >= 70.0

        # Case B: High Risk
        vector_struggling = StudentFeatureVector(
            practice_attempts_count=1,
            practice_average_percentage=32.0,
            weak_topics_count=4,
            study_notebook_pages=1,
            completion_velocity_ratio=1.4,
        )
        pred_struggling = predict_student_performance(vector_struggling)
        assert pred_struggling["risk_tier"] == "HIGH_RISK"
        assert pred_struggling["predicted_percentage"] < 50.0
        assert "Immediate 1-on-1 tutoring" in pred_struggling["intervention_plan"]


@pytest.mark.asyncio
class TestAIMLAPIEndpoints:
    async def test_performance_prediction_endpoint(self, client: AsyncClient):
        # 1. Sign up student
        signup_resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "student_aiml@examwise.edu",
                "password": "Password123!",
                "full_name": "Alex Morgan",
                "role": "student",
            },
        )
        assert signup_resp.status_code == 201
        token = signup_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Query ML prediction endpoint
        resp = await client.get("/api/v1/performance-prediction", headers=headers)
        assert resp.status_code == 200
        data = resp.json()

        assert "predicted_percentage" in data
        assert "predicted_endterm_score_50m" in data
        assert "predicted_midterm_score_25m" in data
        assert "risk_tier" in data
        assert data["risk_tier"] in ("HIGH_RISK", "MODERATE_RISK", "EXAM_READY")
        assert "intervention_plan" in data
