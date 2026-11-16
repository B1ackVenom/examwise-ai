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


class TestNotebooks:
    async def test_create_and_get_notebook(self, client: AsyncClient):
        token = await _signup_and_get_token(client, "nb_user1@test.com", "student")
        headers = {"Authorization": f"Bearer {token}"}

        # Create notebook
        create_resp = await client.post(
            "/api/v1/notebooks",
            headers=headers,
            json={
                "subject_code": "cs101",
                "subject_title": "Intro to Computer Science",
                "instructor": "Dr. Turing",
                "semester": "Fall 2026",
                "color_theme": "emerald",
                "target_grade": "A+",
                "description": "All lecture notes and assignments",
                "units": ["Unit 1: Logic Gates", "Unit 2: Architecture"],
            },
        )
        assert create_resp.status_code == 201
        nb = create_resp.json()
        nb_id = nb["id"]
        assert nb["subjectCode"] == "CS101"
        assert nb["subjectTitle"] == "Intro to Computer Science"
        assert nb["colorTheme"] == "emerald"
        assert len(nb["units"]) == 2

        # List notebooks
        list_nb = await client.get("/api/v1/notebooks", headers=headers)
        assert list_nb.status_code == 200
        assert any(n["id"] == nb_id for n in list_nb.json())

        # Update notebook
        up_nb = await client.patch(
            f"/api/v1/notebooks/{nb_id}",
            headers=headers,
            json={"target_grade": "O", "progress_percent": 25.0},
        )
        assert up_nb.status_code == 200
        assert up_nb.json()["targetGrade"] == "O"
        assert up_nb.json()["progressPercent"] == 25.0

        # Add Cornell note page
        page_resp = await client.post(
            f"/api/v1/notebooks/{nb_id}/pages",
            headers=headers,
            json={
                "title": "Boolean Algebra Basics",
                "unit_or_chapter": "Unit 1: Logic Gates",
                "cue_points": ["What is De Morgan's Law?", "Truth table for XOR"],
                "main_content": "De Morgan's theorem states (A and B)' = A' or B'.",
                "summary": "Boolean operations form the bedrock of combinational circuits.",
                "tags": ["logic", "circuits"],
            },
        )
        assert page_resp.status_code == 201
        page = page_resp.json()
        assert page["title"] == "Boolean Algebra Basics"
        assert len(page["cuePoints"]) == 2
        page_id = page["id"]

        # Add Sticky Note
        note_resp = await client.post(
            f"/api/v1/notebooks/{nb_id}/sticky-notes",
            headers=headers,
            json={
                "content": "Remember to review karnaugh maps before lab!",
                "color": "yellow",
                "position_x": 120.5,
                "position_y": 80.0,
            },
        )
        assert note_resp.status_code == 201
        note = note_resp.json()
        assert note["text"] == "Remember to review karnaugh maps before lab!"
        note_id = note["id"]

        # Fetch full notebook detail
        get_nb = await client.get(f"/api/v1/notebooks/{nb_id}", headers=headers)
        assert get_nb.status_code == 200
        full_nb = get_nb.json()
        assert len(full_nb["pages"]) == 1
        assert len(full_nb["stickyNotes"]) == 1

        # Update page
        up_page = await client.patch(
            f"/api/v1/notebooks/pages/{page_id}",
            headers=headers,
            json={"title": "Boolean Algebra & K-Maps"},
        )
        assert up_page.status_code == 200
        assert up_page.json()["title"] == "Boolean Algebra & K-Maps"

        # Update sticky note
        up_note = await client.patch(
            f"/api/v1/notebooks/sticky-notes/{note_id}",
            headers=headers,
            json={"color": "pink"},
        )
        assert up_note.status_code == 200
        assert up_note.json()["color"] == "pink"

        # Delete sticky note and page
        del_note = await client.delete(f"/api/v1/notebooks/sticky-notes/{note_id}", headers=headers)
        assert del_note.status_code == 204

        del_page = await client.delete(f"/api/v1/notebooks/pages/{page_id}", headers=headers)
        assert del_page.status_code == 204

        # Delete notebook
        del_nb = await client.delete(f"/api/v1/notebooks/{nb_id}", headers=headers)
        assert del_nb.status_code == 204

        # Verify 404
        get_after = await client.get(f"/api/v1/notebooks/{nb_id}", headers=headers)
        assert get_after.status_code == 404

    async def test_student_data_isolation(self, client: AsyncClient):
        token_a = await _signup_and_get_token(client, "alice@test.com", "student")
        token_b = await _signup_and_get_token(client, "bob@test.com", "student")

        # Alice creates a notebook
        create_resp = await client.post(
            "/api/v1/notebooks",
            headers={"Authorization": f"Bearer {token_a}"},
            json={
                "subject_code": "BIO101",
                "subject_title": "Cell Biology",
                "instructor": "Dr. Watson",
            },
        )
        nb_id = create_resp.json()["id"]

        # Bob attempts to read Alice's notebook -> 403 Forbidden
        bob_get = await client.get(
            f"/api/v1/notebooks/{nb_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert bob_get.status_code == 403

        # Bob lists his notebooks -> should NOT contain Alice's notebook
        bob_list = await client.get(
            "/api/v1/notebooks",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert bob_list.status_code == 200
        assert not any(nb["id"] == nb_id for nb in bob_list.json())
