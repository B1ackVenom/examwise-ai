from __future__ import annotations

import io
import os
import time
from pathlib import Path

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.course import Course, LearningResource
from app.models.user import User


TEST_MATERIALS_DIR = Path("/home/steve/storage/projects/examwise-ai-updated/test_materials")
SYLLABUS_PDF = TEST_MATERIALS_DIR / "CSE2001_DAA_Syllabus.pdf"
NOTES_PDF = TEST_MATERIALS_DIR / "DAA_Unit_1_Notes.pdf"


async def _signup_and_get_token(client: AsyncClient, email: str, role: str) -> str:
    resp = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": f"{role.capitalize()} DAA User",
            "role": role,
        },
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


class TestLiveStudyMaterialAI:
    @pytest.mark.skipif(not SYLLABUS_PDF.exists(), reason="Study materials not downloaded")
    async def test_full_pipeline_with_real_daa_materials(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "daa_prof@test.com", "teacher")
        student_token = await _signup_and_get_token(client, "daa_stud@test.com", "student")

        t_headers = {"Authorization": f"Bearer {teacher_token}"}
        s_headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Create Course: Design and Analysis of Algorithms (CSE2001)
        c_resp = await client.post(
            "/api/v1/courses",
            headers=t_headers,
            json={
                "title": "Design and Analysis of Algorithms",
                "code": "CSE2001",
                "description": "Analysis of algorithms, asymptotic notation, divide and conquer, dynamic programming, greedy algorithms.",
                "department": "Computer Science & Engineering",
                "semester": "Semester 3",
                "credits": 5,
            },
        )
        assert c_resp.status_code == 201
        course_id = c_resp.json()["id"]

        # 2. Add Modules:
        # Module 1: Role of Algorithm in Computing & Asymptotic Analysis
        m1_resp = await client.post(
            f"/api/v1/courses/{course_id}/modules",
            headers=t_headers,
            json={
                "title": "Module 1: Role of Algorithm in Computing & Asymptotic Analysis",
                "description": "Definition of algorithms, performance measurement, asymptotic notations (Big-O, Omega, Theta), recurrence relations.",
                "learning_hours": 10,
                "order_index": 0,
                "key_topics": ["Algorithm definition", "Time and space complexity", "Big-O, Omega, Theta", "Master Theorem"],
            },
        )
        assert m1_resp.status_code == 201
        module1_id = m1_resp.json()["id"]

        # Module 2: Divide and Conquer Strategy & Greedy Method
        m2_resp = await client.post(
            f"/api/v1/courses/{course_id}/modules",
            headers=t_headers,
            json={
                "title": "Module 2: Divide and Conquer & Greedy Method",
                "description": "Binary search, Merge sort, Quick sort, Greedy approach, Fractional knapsack, Job sequencing, Huffman coding.",
                "learning_hours": 10,
                "order_index": 1,
                "key_topics": ["Binary Search", "Merge Sort", "Quick Sort", "Greedy Method", "Fractional Knapsack"],
            },
        )
        assert m2_resp.status_code == 201
        module2_id = m2_resp.json()["id"]

        # 3. Upload real Syllabus PDF
        with open(SYLLABUS_PDF, "rb") as f:
            syllabus_bytes = f.read()

        up_syl = await client.post(
            f"/api/v1/courses/{course_id}/resources/upload",
            headers=t_headers,
            data={"title": "Official Course Syllabus", "module_id": module1_id, "tags": "syllabus,curriculum"},
            files={"file": ("CSE2001_DAA_Syllabus.pdf", io.BytesIO(syllabus_bytes), "application/pdf")},
        )
        assert up_syl.status_code == 201
        assert up_syl.json()["type"] == "pdf"

        # 4. Upload real Unit 1 Lecture Notes PDF
        with open(NOTES_PDF, "rb") as f:
            notes_bytes = f.read()

        up_notes = await client.post(
            f"/api/v1/courses/{course_id}/resources/upload",
            headers=t_headers,
            data={"title": "Unit 1 Lecture Slides", "module_id": module1_id, "tags": "notes,slides,algorithms"},
            files={"file": ("DAA_Unit_1_Notes.pdf", io.BytesIO(notes_bytes), "application/pdf")},
        )
        assert up_notes.status_code == 201

        # 5. Live AI Question Prediction using host Ollama qwen3:1.7b
        start_t = time.perf_counter()
        pred_resp = await client.post(
            "/api/v1/questions/predict",
            headers=s_headers,
            json={
                "course_id": course_id,
                "module_id": module1_id,
                "count": 2,
                "difficulty": "medium",
                "focus_topic": "Asymptotic analysis and algorithm definition",
            },
        )
        pred_duration = time.perf_counter() - start_t
        print(f"\n[BENCHMARK] Live Question Prediction took: {pred_duration:.2f}s")

        assert pred_resp.status_code == 200, f"Prediction failed: {pred_resp.text}"
        questions = pred_resp.json()
        assert len(questions) >= 1
        print(f"[VERIFIED] Predicted {len(questions)} questions from real DAA notes:")
        for q in questions:
            print(f"  - ({q['difficulty'].upper()} / {q['importanceRating']}): {q['question']}")
            assert len(q["question"]) > 5
            assert q["difficulty"] in ("easy", "medium", "hard")

        # 6. Live AI Mid-Term Paper Generation (25 Marks, No MCQs)
        # Pattern: Module 1 (10M: 5M+5M) + Module 2 (15M: 5M+5M+5M), Total 25M
        start_t = time.perf_counter()
        mid_resp = await client.post(
            "/api/v1/practice-papers/generate",
            headers=s_headers,
            json={
                "course_id": course_id,
                "title": "DAA Mid-Term Examination",
                "description": "Mid-term paper: Module 1 (10M) + Module 2 (15M), Total 25M. Strictly No MCQs.",
                "exam_type": "mid_term",
                "duration_minutes": 60,
                "total_marks": 25,
                "difficulty": "medium",
                "module_ids": [module1_id, module2_id],
            },
        )
        mid_duration = time.perf_counter() - start_t
        print(f"\n[BENCHMARK] Live Mid-Term Paper Generation took: {mid_duration:.2f}s")

        assert mid_resp.status_code == 201, f"Mid-Term generation failed: {mid_resp.text}"
        mid_paper = mid_resp.json()
        assert mid_paper["examType"] == "mid_term"
        assert mid_paper["totalMarks"] == 25
        print(f"[VERIFIED] Generated Mid-Term '{mid_paper['title']}' ({mid_paper['totalMarks']} Marks, {len(mid_paper['questions'])} Questions):")
        total_mid_marks = 0
        for q in mid_paper["questions"]:
            print(f"  - {q['questionText']} ({q['marks']} Marks, type={q['type']})")
            assert q["type"] == "descriptive", f"Expected descriptive, got {q['type']}"
            assert q["options"] is None, "Expected no MCQs in Mid-Term exam"
            total_mid_marks += q["marks"]
        print(f"  Total marks summed: {total_mid_marks} / 25")

        # 7. Live AI End-Term Paper Generation (50 Marks, 10 Marks each across all 5 Modules, No MCQs)
        start_t = time.perf_counter()
        end_resp = await client.post(
            "/api/v1/practice-papers/generate",
            headers=s_headers,
            json={
                "course_id": course_id,
                "title": "DAA Comprehensive University End-Term Examination",
                "description": "End-term paper: 10 Marks for each of all 5 Modules. Total 50M. Strictly No MCQs.",
                "exam_type": "end_term",
                "duration_minutes": 120,
                "total_marks": 50,
                "difficulty": "hard",
            },
        )
        end_duration = time.perf_counter() - start_t
        print(f"\n[BENCHMARK] Live End-Term Paper Generation took: {end_duration:.2f}s")

        assert end_resp.status_code == 201, f"End-Term generation failed: {end_resp.text}"
        end_paper = end_resp.json()
        assert end_paper["examType"] == "end_term"
        assert end_paper["totalMarks"] == 50
        print(f"[VERIFIED] Generated End-Term '{end_paper['title']}' ({end_paper['totalMarks']} Marks, {len(end_paper['questions'])} Questions):")
        total_end_marks = 0
        for q in end_paper["questions"]:
            print(f"  - {q['questionText']} ({q['marks']} Marks, type={q['type']})")
            assert q["type"] == "descriptive", f"Expected descriptive, got {q['type']}"
            assert q["options"] is None, "Expected no MCQs in End-Term exam"
            total_end_marks += q["marks"]
        print(f"  Total marks summed: {total_end_marks} / 50")

        # 8. Student Submits Attempt for Mid-Term & Tests Scoring
        answers_payload = {}
        for q in mid_paper["questions"]:
            answers_payload[q["id"]] = f"Detailed student answer derivation: {q['questionText'][:40]}"

        sub_resp = await client.post(
            f"/api/v1/practice-papers/{mid_paper['id']}/submit",
            headers=s_headers,
            json={"answers": answers_payload},
        )
        assert sub_resp.status_code == 200
        attempt = sub_resp.json()
        assert attempt["score"] > 0
        assert attempt["totalMarks"] == 25
        print(f"[VERIFIED] Mid-Term Attempt scored: {attempt['score']}/{attempt['totalMarks']} ({attempt['percentage']}%)")
        assert attempt["score"] > 0
        assert attempt["percentage"] > 0
        print(f"[VERIFIED] Attempt scored: {attempt['score']}/{attempt['totalMarks']} ({attempt['percentage']}%)")
