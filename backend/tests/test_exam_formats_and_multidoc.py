from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.models.course import Course, CourseModule, LearningResource
from app.services.ai.base import AIResponse
from app.services.document_context import build_multi_document_context


def test_build_multi_document_context():
    # Verify multi-document context distribution across multiple modules and docs
    mod1 = CourseModule(id="m1", course_id="c1", title="Divide and Conquer", order_index=0)
    mod2 = CourseModule(id="m2", course_id="c1", title="Dynamic Programming", order_index=1)

    res1 = LearningResource(
        id="r1",
        course_id="c1",
        module_id="m1",
        uploader_id="u1",
        title="Merge Sort Lecture Notes",
        resource_type="pdf",
        extracted_text="Merge sort is an efficient, general-purpose, and comparison-based sorting algorithm. Most implementations produce a stable sort.",
    )
    res2 = LearningResource(
        id="r2",
        course_id="c1",
        module_id="m1",
        uploader_id="u1",
        title="QuickSort Tutorial Slides",
        resource_type="pptx",
        extracted_text="Quicksort is an in-place sorting algorithm. Developed by British computer scientist Tony Hoare in 1959.",
    )
    res3 = LearningResource(
        id="r3",
        course_id="c1",
        module_id="m2",
        uploader_id="u1",
        title="0/1 Knapsack Problem",
        resource_type="docx",
        extracted_text="The knapsack problem is a problem in combinatorial optimization: Given a set of items, each with a weight and a value, determine the number of each item to include.",
    )

    context = build_multi_document_context([res1, res2, res3], [mod1, mod2], max_total_chars=2000)

    # All documents and both modules must be represented
    assert "Module 1: Divide and Conquer" in context
    assert "Module 2: Dynamic Programming" in context
    assert "Merge Sort Lecture Notes" in context
    assert "QuickSort Tutorial Slides" in context
    assert "0/1 Knapsack Problem" in context


async def _signup_and_get_token(client: AsyncClient, email: str, role: str) -> str:
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "SecurePassword123!", "full_name": f"User {role}", "role": role},
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


class TestExamFormatsAndMultiDoc:
    async def test_mid_term_and_end_term_generation_and_scoring(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "prof_exams@test.com", "teacher")
        student_token = await _signup_and_get_token(client, "stud_exams@test.com", "student")

        t_headers = {"Authorization": f"Bearer {teacher_token}"}
        s_headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Create Course with 2 Modules
        c_resp = await client.post(
            "/api/v1/courses",
            headers=t_headers,
            json={
                "title": "Design and Analysis of Algorithms",
                "code": "CS301_EXAMS",
                "department": "CSE",
                "semester": "Semester 5",
            },
        )
        assert c_resp.status_code == 201
        course_id = c_resp.json()["id"]

        m1_resp = await client.post(
            f"/api/v1/courses/{course_id}/modules",
            headers=t_headers,
            json={"title": "Divide and Conquer", "order_index": 0},
        )
        assert m1_resp.status_code == 201
        m1_id = m1_resp.json()["id"]

        m2_resp = await client.post(
            f"/api/v1/courses/{course_id}/modules",
            headers=t_headers,
            json={"title": "Dynamic Programming", "order_index": 1},
        )
        assert m2_resp.status_code == 201
        m2_id = m2_resp.json()["id"]

        # 2. Add multiple documents to each module
        for title, m_id in [
            ("Unit 1 Notes PDF", m1_id),
            ("Unit 1 Assignment DOCX", m1_id),
            ("Unit 2 DP Slides PPTX", m2_id),
            ("Unit 2 DP Question Bank TXT", m2_id),
        ]:
            res = await client.post(
                f"/api/v1/courses/{course_id}/resources",
                headers=t_headers,
                json={
                    "title": title,
                    "module_id": m_id,
                    "resource_type": "notes",
                    "description": f"Content covering {title}",
                },
            )
            assert res.status_code == 201

        # 3. Test Mid-Term Exam (25 Marks) Generation - Strictly Descriptive, NO MCQs
        mock_midterm_ai = {
            "title": "CS301 Mid-Term Examination",
            "description": "Mid-term test covering Module 1 (10M) & Module 2 (15M) (25 Marks Total, No MCQs)",
            "duration_minutes": 60,
            "total_marks": 25,
            "difficulty": "medium",
            "questions": [
                {
                    "question_number": 1,
                    "sub_question_label": "Q1(a)",
                    "module_number": 1,
                    "question_text": "Define an algorithm and explain Big-O, Omega, and Theta asymptotic notations with diagrams.",
                    "type": "descriptive",
                    "marks": 5,
                    "options": None,
                    "correct_answer": "An algorithm is a well-defined sequence of computational steps. Big-O represents asymptotic upper bound, Omega lower bound, Theta tight bound.",
                    "explanation": "2 Marks for definition, 3 Marks for mathematical expressions and diagrams of asymptotic notations.",
                    "topic": "Module 1: Asymptotic Analysis",
                    "difficulty": "medium",
                },
                {
                    "question_number": 2,
                    "sub_question_label": "Q1(b)",
                    "module_number": 1,
                    "question_text": "Solve the recurrence relation T(n) = 2T(n/2) + O(n) using the Master Theorem and recursion tree method.",
                    "type": "descriptive",
                    "marks": 5,
                    "options": None,
                    "correct_answer": "Using Master Theorem with a=2, b=2, k=1: log_b(a) = log_2(2) = 1. Since f(n) = Theta(n^1), Case 2 applies: T(n) = Theta(n log n).",
                    "explanation": "2 Marks for identifying parameters a, b, f(n); 3 Marks for derivation steps and final complexity.",
                    "topic": "Module 1: Recurrence Relations",
                    "difficulty": "medium",
                },
                {
                    "question_number": 3,
                    "sub_question_label": "Q2(a)",
                    "module_number": 2,
                    "question_text": "Write the Divide and Conquer algorithm for Merge Sort and prove its recurrence relation.",
                    "type": "descriptive",
                    "marks": 5,
                    "options": None,
                    "correct_answer": "Divide array at midpoint m = (l+r)/2. Recursively sort left and right halves, then merge sorted halves in O(n) time.",
                    "explanation": "2 Marks for pseudocode, 3 Marks for recurrence proof and time analysis.",
                    "topic": "Module 2: Divide and Conquer",
                    "difficulty": "medium",
                },
                {
                    "question_number": 4,
                    "sub_question_label": "Q2(b)",
                    "module_number": 2,
                    "question_text": "Explain the Greedy algorithm for the Fractional Knapsack problem with an illustrative numerical example.",
                    "type": "descriptive",
                    "marks": 5,
                    "options": None,
                    "correct_answer": "Calculate value-to-weight ratio v_i/w_i for each item. Sort items in descending order of ratio. Greedily take entire items while capacity allows, then take fraction of next item.",
                    "explanation": "2 Marks for ratio sorting concept, 3 Marks for numerical walkthrough.",
                    "topic": "Module 2: Greedy Method",
                    "difficulty": "medium",
                },
                {
                    "question_number": 5,
                    "sub_question_label": "Q2(c)",
                    "module_number": 2,
                    "question_text": "Differentiate between Greedy strategy and Dynamic Programming paradigms with suitable examples.",
                    "type": "descriptive",
                    "marks": 5,
                    "options": None,
                    "correct_answer": "Greedy makes locally optimal choice at each step without reconsidering. DP solves subproblems with overlapping substructure and memoizes results.",
                    "explanation": "5 points of distinction (1 Mark each).",
                    "topic": "Module 2: Algorithm Design Paradigms",
                    "difficulty": "medium",
                },
            ],
        }

        with patch("app.services.ai.manager.AIProviderManager.generate_structured") as mock_gen:
            from app.api.v1.endpoints.practice import AIGeneratedPaperResult
            mock_gen.return_value = (
                AIGeneratedPaperResult(**mock_midterm_ai),
                AIResponse(raw_text=json.dumps(mock_midterm_ai), model_name="mock", provider_type="mock"),
            )

            mid_resp = await client.post(
                "/api/v1/practice-papers/generate",
                headers=s_headers,
                json={
                    "course_id": course_id,
                    "title": "CS301 Mid-Term Examination",
                    "exam_type": "mid_term",
                    "total_marks": 25,
                    "duration_minutes": 60,
                    "difficulty": "medium",
                    "module_ids": [m1_id, m2_id],
                },
            )
            assert mid_resp.status_code == 201
            mid_data = mid_resp.json()
            assert mid_data["examType"] == "mid_term"
            assert mid_data["totalMarks"] == 25
            assert mid_data["durationMinutes"] == 60
            assert len(mid_data["questions"]) == 5
            for q in mid_data["questions"]:
                assert q["type"] == "descriptive"
                assert q["options"] is None

            # 4. Test End-Term Exam (50 Marks) Generation - 10 Marks for each of 5 Modules, NO MCQs
            end_questions = []
            for m_num in range(1, 6):
                end_questions.append({
                    "question_number": (m_num - 1) * 2 + 1,
                    "sub_question_label": f"Q{m_num}(a)",
                    "module_number": m_num,
                    "question_text": f"Explain the core theoretical principles and formulations of Module {m_num}.",
                    "type": "descriptive",
                    "marks": 5,
                    "options": None,
                    "correct_answer": f"Detailed academic derivation for Module {m_num}.",
                    "explanation": "2 Marks theory, 3 Marks derivation.",
                    "topic": f"Module {m_num}",
                    "difficulty": "hard",
                })
                end_questions.append({
                    "question_number": (m_num - 1) * 2 + 2,
                    "sub_question_label": f"Q{m_num}(b)",
                    "module_number": m_num,
                    "question_text": f"Solve the algorithm optimization problem and state time complexity for Module {m_num}.",
                    "type": "descriptive",
                    "marks": 5,
                    "options": None,
                    "correct_answer": f"Optimal substructure equation and proof for Module {m_num}.",
                    "explanation": "2 Marks formulation, 3 Marks proof.",
                    "topic": f"Module {m_num}",
                    "difficulty": "hard",
                })

            mock_endterm_ai = {
                "title": "CS301 Comprehensive End-Term Examination",
                "description": "End-term comprehensive exam covering all 5 modules (10M each = 50 Marks Total, No MCQs)",
                "duration_minutes": 120,
                "total_marks": 50,
                "difficulty": "hard",
                "questions": end_questions,
            }

            mock_gen.return_value = (
                AIGeneratedPaperResult(**mock_endterm_ai),
                AIResponse(raw_text=json.dumps(mock_endterm_ai), model_name="mock", provider_type="mock"),
            )

            end_resp = await client.post(
                "/api/v1/practice-papers/generate",
                headers=s_headers,
                json={
                    "course_id": course_id,
                    "title": "CS301 Comprehensive End-Term Examination",
                    "exam_type": "end_term",
                    "total_marks": 50,
                    "duration_minutes": 120,
                    "difficulty": "hard",
                    "module_ids": [m1_id, m2_id],
                },
            )
            assert end_resp.status_code == 201
            end_data = end_resp.json()
            assert end_data["examType"] == "end_term"
            assert end_data["totalMarks"] == 50
            assert end_data["durationMinutes"] == 120
            assert len(end_data["questions"]) == 10
            for q in end_data["questions"]:
                assert q["type"] == "descriptive"
                assert q["options"] is None

            # 5. Student submits attempt for the End-Term paper
            paper_id = end_data["id"]
            answers_dict = {}
            for q in end_data["questions"]:
                answers_dict[q["id"]] = f"Student submitted answer derivation for {q['questionText'][:30]}"

            att_resp = await client.post(
                f"/api/v1/practice-papers/{paper_id}/submit",
                headers=s_headers,
                json={"answers": answers_dict},
            )
            assert att_resp.status_code == 200
            att_data = att_resp.json()
            assert att_data["score"] > 0
            assert att_data["totalMarks"] == 50
            assert att_resp.status_code == 200
            att_data = att_resp.json()
            assert att_data["score"] > 0
            assert att_data["totalMarks"] == 50
