from __future__ import annotations

import pytest
from httpx import AsyncClient


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


class TestCourses:
    async def test_teacher_can_create_course(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "prof1@test.com", "teacher")
        headers = {"Authorization": f"Bearer {teacher_token}"}

        resp = await client.post(
            "/api/v1/courses",
            headers=headers,
            json={
                "title": "Data Structures & Algorithms",
                "code": "CS201",
                "description": "Fundamental algorithms and complexity analysis",
                "department": "Computer Science",
                "semester": "Fall 2026",
                "credits": 4,
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Data Structures & Algorithms"
        assert data["code"] == "CS201"
        assert data["instructor"] == "Teacher User"
        assert data["credits"] == 4

        # Test duplicate course code
        dup = await client.post(
            "/api/v1/courses",
            headers=headers,
            json={"title": "Another Course", "code": "CS201"},
        )
        assert dup.status_code == 409

    async def test_student_cannot_create_course(self, client: AsyncClient):
        student_token = await _signup_and_get_token(client, "stud_block@test.com", "student")
        headers = {"Authorization": f"Bearer {student_token}"}

        resp = await client.post(
            "/api/v1/courses",
            headers=headers,
            json={"title": "Hacked Course", "code": "HACK101"},
        )
        assert resp.status_code == 403

    async def test_course_enrollment_and_unenrollment(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "prof_enroll@test.com", "teacher")
        student_token = await _signup_and_get_token(client, "stud_enroll@test.com", "student")

        # Teacher creates course
        c_resp = await client.post(
            "/api/v1/courses",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"title": "Operating Systems", "code": "CS301"},
        )
        course_id = c_resp.json()["id"]

        # Student browses active courses
        browse_resp = await client.get(
            "/api/v1/courses?browse=true",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert browse_resp.status_code == 200
        assert any(c["id"] == course_id for c in browse_resp.json())

        # Student enrolls
        enroll_resp = await client.post(
            f"/api/v1/courses/{course_id}/enroll",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert enroll_resp.status_code == 201
        assert enroll_resp.json()["status"] == "enrolled"

        # Duplicate enroll is idempotent
        enroll_again = await client.post(
            f"/api/v1/courses/{course_id}/enroll",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert enroll_again.status_code == 201

        # Now student's course list shows it
        my_courses = await client.get(
            "/api/v1/courses",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert any(c["id"] == course_id for c in my_courses.json())

        # Student unenrolls
        unenroll = await client.delete(
            f"/api/v1/courses/{course_id}/enroll",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert unenroll.status_code == 204

    async def test_course_update_and_delete(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "prof_up@test.com", "teacher")
        headers = {"Authorization": f"Bearer {teacher_token}"}

        c_resp = await client.post(
            "/api/v1/courses",
            headers=headers,
            json={"title": "Compilers", "code": "CS501"},
        )
        course_id = c_resp.json()["id"]

        # Update course
        up_resp = await client.patch(
            f"/api/v1/courses/{course_id}",
            headers=headers,
            json={"title": "Advanced Compilers", "credits": 4},
        )
        assert up_resp.status_code == 200
        assert up_resp.json()["title"] == "Advanced Compilers"
        assert up_resp.json()["credits"] == 4

        # Delete course
        del_resp = await client.delete(f"/api/v1/courses/{course_id}", headers=headers)
        assert del_resp.status_code == 204

        # Verify 404
        get_resp = await client.get(f"/api/v1/courses/{course_id}", headers=headers)
        assert get_resp.status_code == 404


class TestModulesAndResources:
    async def test_module_lifecycle(self, client: AsyncClient):
        teacher_token = await _signup_and_get_token(client, "prof_mod@test.com", "teacher")
        headers = {"Authorization": f"Bearer {teacher_token}"}

        # Create course
        c_resp = await client.post(
            "/api/v1/courses",
            headers=headers,
            json={"title": "Computer Networks", "code": "CS401"},
        )
        course_id = c_resp.json()["id"]

        # Add module
        m_resp = await client.post(
            f"/api/v1/courses/{course_id}/modules",
            headers=headers,
            json={
                "title": "Module 1: Physical Layer",
                "description": "Signals and media",
                "learning_hours": 8,
                "key_topics": ["Fourier analysis", "Bandwidth", "Fiber optics"],
            },
        )
        assert m_resp.status_code == 201
        mod_id = m_resp.json()["id"]
        assert m_resp.json()["order"] == 1
        assert "Fiber optics" in m_resp.json()["key_topics"]

        # List modules
        list_mod = await client.get(f"/api/v1/courses/{course_id}/modules", headers=headers)
        assert list_mod.status_code == 200
        assert len(list_mod.json()) >= 1

        # Update module
        up_resp = await client.patch(
            f"/api/v1/courses/modules/{mod_id}",
            headers=headers,
            json={"status": "in_progress", "learning_hours": 10},
        )
        assert up_resp.status_code == 200
        assert up_resp.json()["status"] == "in_progress"
        assert up_resp.json()["learning_hours"] == 10

        # Add Learning Resource
        r_resp = await client.post(
            f"/api/v1/courses/{course_id}/resources",
            headers=headers,
            json={
                "module_id": mod_id,
                "title": "Lecture 1 Slides",
                "description": "Introduction to transmission media",
                "resource_type": "pdf",
                "tags": ["lecture", "slides"],
            },
        )
        assert r_resp.status_code == 201
        res_id = r_resp.json()["id"]

        # List resources with search
        list_res = await client.get(
            f"/api/v1/courses/{course_id}/resources?search=Slides",
            headers=headers,
        )
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # Delete resource
        del_r = await client.delete(f"/api/v1/courses/resources/{res_id}", headers=headers)
        assert del_r.status_code == 204

        # Delete module
        del_m = await client.delete(f"/api/v1/courses/modules/{mod_id}", headers=headers)
        assert del_m.status_code == 204
