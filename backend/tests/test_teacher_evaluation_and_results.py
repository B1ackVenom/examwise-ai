from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from app.api.v1.endpoints.evaluation import AIAnswerEvaluationResult
from app.services.ai.base import AIResponse


async def _signup_and_get_token(client: AsyncClient, email: str, role: str) -> str:
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "SecurePassword123!", "full_name": f"User {role}", "role": role},
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


class TestTeacherEvaluationAndResults:
    async def test_full_evaluation_and_results_workflow(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "eval_prof@test.com", "teacher")
        student_token = await _signup_and_get_token(client, "eval_stud@test.com", "student")

        t_headers = {"Authorization": f"Bearer {teacher_token}"}
        s_headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Teacher creates Course
        c_resp = await client.post(
            "/api/v1/courses",
            headers=t_headers,
            json={
                "title": "Algorithms & Complexity",
                "code": "CS401_EVAL",
                "department": "CSE",
                "semester": "Semester 6",
            },
        )
        assert c_resp.status_code == 201
        course_id = c_resp.json()["id"]

        # 2. Teacher creates Exam with 2 Questions & Rubrics (Draft status)
        exam_resp = await client.post(
            "/api/v1/exams",
            headers=t_headers,
            json={
                "course_id": course_id,
                "title": "CS401 Mid-Term Examination",
                "description": "Descriptive exam on Divide & Conquer and Dynamic Programming",
                "exam_type": "written",
                "total_marks": 20,
                "duration_minutes": 60,
                "questions": [
                    {
                        "question_text": "Explain Merge Sort algorithm, derive its recurrence relation, and state time complexity.",
                        "question_type": "descriptive",
                        "marks": 10,
                        "expected_answer": "Divide array at midpoint. Recursively sort halves. Merge in O(n). Recurrence T(n) = 2T(n/2) + O(n). Worst case O(n log n).",
                        "topic": "Divide and Conquer",
                        "difficulty": "medium",
                        "rubric_criteria": [
                            {"criterion": "Algorithm pseudocode & explanation", "max_marks": 4},
                            {"criterion": "Recurrence derivation & Master theorem", "max_marks": 3},
                            {"criterion": "Time and space complexity analysis", "max_marks": 3},
                        ],
                    },
                    {
                        "question_text": "State the principle of optimality in Dynamic Programming and compare with Greedy method.",
                        "question_type": "descriptive",
                        "marks": 10,
                        "expected_answer": "Bellman principle of optimality. Optimal substructure and overlapping subproblems for DP. Greedy makes local optimum.",
                        "topic": "Dynamic Programming",
                        "difficulty": "medium",
                        "rubric_criteria": [
                            {"criterion": "Principle of optimality definition", "max_marks": 5},
                            {"criterion": "Distinction from Greedy method with examples", "max_marks": 5},
                        ],
                    },
                ],
            },
        )
        assert exam_resp.status_code == 201
        exam_data = exam_resp.json()
        exam_id = exam_data["id"]
        assert exam_data["status"] == "draft"
        assert len(exam_data["questions"]) == 2
        q1_id = exam_data["questions"][0]["id"]
        q2_id = exam_data["questions"][1]["id"]

        # 3. Student tries to access draft exam -> 403 Forbidden
        stud_get = await client.get(f"/api/v1/exams/{exam_id}", headers=s_headers)
        assert stud_get.status_code == 403

        # 4. Teacher publishes the Exam
        pub_exam = await client.post(f"/api/v1/exams/{exam_id}/publish", headers=t_headers)
        assert pub_exam.status_code == 200
        assert pub_exam.json()["status"] == "published"

        # 5. Student accesses published exam and submits answers
        stud_access = await client.get(f"/api/v1/exams/{exam_id}", headers=s_headers)
        assert stud_access.status_code == 200

        sub_resp = await client.post(
            f"/api/v1/exams/{exam_id}/submissions",
            headers=s_headers,
            json={
                "answers": [
                    {
                        "exam_question_id": q1_id,
                        "answer_text": "Merge sort divides the list into halves, sorts each half recursively, and merges them in O(n) time. T(n) = 2T(n/2) + cn = O(n log n).",
                    },
                    {
                        "exam_question_id": q2_id,
                        "answer_text": "Principle of optimality states that subproblems have optimal solutions. Dynamic programming memoizes results, whereas Greedy takes best current choice.",
                    },
                ]
            },
        )
        assert sub_resp.status_code == 201
        sub_data = sub_resp.json()
        submission_id = sub_data["id"]
        assert sub_data["status"] == "submitted"
        assert len(sub_data["evaluations"]) == 2

        # 6. Teacher triggers AI-assisted Evaluation
        mock_eval_q1 = AIAnswerEvaluationResult(
            proposed_marks=8.5,
            explanation="Strong understanding of merge sort and recurrence relation. Minor omission in formal base case description.",
            key_points_covered=["Divide and conquer concept", "Recurrence relation T(n) = 2T(n/2) + cn", "Time complexity O(n log n)"],
            key_points_missing=["Explicit space complexity discussion"],
            confidence_score=0.92,
        )
        mock_eval_q2 = AIAnswerEvaluationResult(
            proposed_marks=9.0,
            explanation="Clear distinction between DP and Greedy. Correct definition of principle of optimality.",
            key_points_covered=["Bellman optimality", "Memoization vs local optimum"],
            key_points_missing=["Concrete problem example"],
            confidence_score=0.95,
        )

        with patch("app.services.ai.manager.AIProviderManager.generate_structured") as mock_ai:
            mock_ai.side_effect = [
                (mock_eval_q1, AIResponse(raw_text=json.dumps(mock_eval_q1.model_dump()), model_name="mock", provider_type="ollama")),
                (mock_eval_q2, AIResponse(raw_text=json.dumps(mock_eval_q2.model_dump()), model_name="mock", provider_type="ollama")),
            ]

            ai_eval_resp = await client.post(
                f"/api/v1/submissions/{submission_id}/ai-evaluate",
                headers=t_headers,
            )
            assert ai_eval_resp.status_code == 200
            eval_data = ai_eval_resp.json()
            assert eval_data["status"] == "under_review"

            eval1 = next(e for e in eval_data["evaluations"] if e["exam_question_id"] == q1_id)
            eval2 = next(e for e in eval_data["evaluations"] if e["exam_question_id"] == q2_id)
            assert eval1["ai_proposed_marks"] == 8.5
            assert eval2["ai_proposed_marks"] == 9.0
            assert eval1["is_approved"] is False

            # 7. Teacher reviews and overrides/approves Question 1 marks
            rev1_resp = await client.put(
                f"/api/v1/evaluations/{eval1['id']}/teacher-review",
                headers=t_headers,
                json={"marks": 9.0, "comment": "Good derivation. Awarding 9/10.", "approve": True},
            )
            assert rev1_resp.status_code == 200
            rev1 = rev1_resp.json()
            assert rev1["teacher_marks"] == 9.0
            assert rev1["is_approved"] is True

            # 8. Teacher approves Question 2 marks as proposed
            rev2_resp = await client.put(
                f"/api/v1/evaluations/{eval2['id']}/teacher-review",
                headers=t_headers,
                json={"marks": 9.0, "comment": "Accepted AI proposed marks.", "approve": True},
            )
            assert rev2_resp.status_code == 200

            # 9. Teacher finalizes the submission
            fin_resp = await client.post(
                f"/api/v1/submissions/{submission_id}/finalize",
                headers=t_headers,
            )
            assert fin_resp.status_code == 200
            fin_data = fin_resp.json()
            assert fin_data["status"] == "evaluated"
            assert fin_data["total_score"] == 18.0
            assert fin_data["is_fully_evaluated"] is True

        # 10. Marksheet Batch Verification & Result Publication
        student_id = sub_data["student_id"]
        mb_resp = await client.post(
            "/api/v1/marksheets/batches",
            headers=t_headers,
            json={
                "exam_id": exam_id,
                "batch_name": "CS401 Mid-Term Official Marksheet",
                "notes": "Verified mid-term results batch",
                "records": [
                    {
                        "student_id": student_id,
                        "total_marks": 18.0,
                        "max_marks": 20,
                        "grade": "A",
                        "breakdown": {"Q1": 9.0, "Q2": 9.0},
                    }
                ],
            },
        )
        assert mb_resp.status_code == 201
        batch_id = mb_resp.json()["id"]

        # Verify batch
        verify_resp = await client.post(f"/api/v1/marksheets/batches/{batch_id}/verify", headers=t_headers)
        assert verify_resp.status_code == 200
        assert verify_resp.json()["status"] == "verified"

        # Publish results
        pub_res = await client.post(f"/api/v1/marksheets/batches/{batch_id}/publish", headers=t_headers)
        assert pub_res.status_code == 200
        published = pub_res.json()
        assert len(published) == 1
        assert published[0]["total_marks"] == 18.0
        assert published[0]["percentage"] == 90.0
        assert published[0]["grade"] == "A"
        assert published[0]["rank"] == 1

        # 11. Student accesses their published official result
        my_results_resp = await client.get("/api/v1/results/my-results", headers=s_headers)
        assert my_results_resp.status_code == 200
        my_res_list = my_results_resp.json()
        assert len(my_res_list) >= 1
        my_res = my_res_list[0]
        assert my_res["exam_id"] == exam_id
        assert my_res["total_marks"] == 18.0
        assert my_res["percentage"] == 90.0
        assert my_res["rank"] == 1

        # 12. Audit Trail Inspection (Teacher/Admin checks immutable log)
        audit_resp = await client.get("/api/v1/audit-events", headers=t_headers)
        assert audit_resp.status_code == 200
        events = audit_resp.json()
        actions = [ev["action"] for ev in events]
        print(f"[AUDIT LOGGED ACTIONS]: {actions}")
        assert "exam.created" in actions
        assert "exam.published" in actions
        assert "submission.created" in actions
        assert "submission.ai_evaluated" in actions
        assert "marks.approved" in actions
        assert "submission.finalized" in actions
        assert "results.published" in actions
