from __future__ import annotations

import io
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_config import AIProviderConfig
from app.models.user import User
from app.services.ai.base import AITask, AIResponse
from app.services.ai.crypto import decrypt_secret, encrypt_secret
from app.services.ai.manager import AIProviderManager, AIProviderManagerError, ai_manager
from app.services.ai.ollama import OllamaAdapter


class SampleEvaluationOutput(BaseModel):
    marks: float
    feedback: str
    strengths: list[str]


async def _get_admin_token(client: AsyncClient, db_session: AsyncSession) -> str:
    # Sign up as student then elevate to admin directly in DB for testing
    resp = await client.post(
        "/api/v1/auth/signup",
        json={
            "email": "admin_test@examwise.ai",
            "password": "Password123!",
            "full_name": "Admin Tester",
            "role": "student",
        },
    )
    assert resp.status_code == 201
    token = resp.json()["access_token"]

    from sqlalchemy import update
    await db_session.execute(
        update(User).where(User.email == "admin_test@examwise.ai").values(role="admin")
    )
    await db_session.commit()
    return token


class TestCrypto:
    def test_encrypt_and_decrypt(self):
        secret = "sk-live-super-secret-key-12345"
        encrypted = encrypt_secret(secret)
        assert encrypted != secret
        assert encrypted is not None

        decrypted = decrypt_secret(encrypted)
        assert decrypted == secret

    def test_decrypt_none_returns_none(self):
        assert decrypt_secret(None) is None
        assert encrypt_secret(None) is None


class TestAIProviderManager:
    async def test_structured_generation_with_pydantic_validation(self, db_session: AsyncSession):
        manager = AIProviderManager()

        mock_json_response = '{"marks": 8.5, "feedback": "Solid answer with clear definitions", "strengths": ["Clear notation", "Complete explanation"]}'

        with patch.object(
            OllamaAdapter,
            "generate",
            new_callable=AsyncMock,
            return_value=AIResponse(
                raw_text=f"```json\n{mock_json_response}\n```",
                model_name="llama3.2",
                provider_type="ollama",
            ),
        ):
            validated, ai_resp = await manager.generate_structured(
                task=AITask.ANSWER_EVALUATION,
                prompt="Evaluate this student answer on binary trees",
                schema=SampleEvaluationOutput,
                db=db_session,
            )

            assert isinstance(validated, SampleEvaluationOutput)
            assert validated.marks == 8.5
            assert "Clear notation" in validated.strengths
            assert ai_resp.model_name == "llama3.2"

    async def test_fallback_when_primary_fails(self, db_session: AsyncSession):
        manager = AIProviderManager()

        # Add two providers to db: primary and fallback
        p1 = AIProviderConfig(
            id="p1-primary",
            name="Primary Cloud Provider",
            provider_type="openai_compatible",
            model_name="mock-primary",
            base_url="https://api.mock.com",
            is_enabled=True,
            priority=10,
        )
        p2 = AIProviderConfig(
            id="p2-fallback",
            name="Fallback Local Provider",
            provider_type="ollama",
            model_name="llama3.2",
            is_enabled=True,
            priority=20,
        )
        db_session.add(p1)
        db_session.add(p2)
        await db_session.commit()

        # Mock the adapters' generate methods
        with patch("app.services.ai.openai.OpenAIAdapter.generate", side_effect=RuntimeError("Primary connection timeout")), \
             patch("app.services.ai.ollama.OllamaAdapter.generate", return_value=AIResponse(
                 raw_text="Fallback response text",
                 model_name="llama3.2",
                 provider_type="ollama",
             )):
            response = await manager.generate(
                task=AITask.STUDY_ASSISTANCE,
                prompt="Explain virtual memory",
                db=db_session,
            )
            assert response.raw_text == "Fallback response text"
            assert response.provider_type == "ollama"


class TestAdminAIEndpoints:
    async def test_non_admin_cannot_access_ai_admin(self, client: AsyncClient):
        # Student signup
        signup_resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "student_no_admin@test.com",
                "password": "Password123!",
                "full_name": "Student",
                "role": "student",
            },
        )
        token = signup_resp.json()["access_token"]
        resp = await client.get("/api/v1/admin/ai/providers", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

    async def test_admin_provider_crud_and_routing(self, client: AsyncClient, db_session: AsyncSession):
        admin_token = await _get_admin_token(client, db_session)
        headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Create AI Provider Config
        create_resp = await client.post(
            "/api/v1/admin/ai/providers",
            headers=headers,
            json={
                "name": "Local Ollama Llama3",
                "provider_type": "ollama",
                "model_name": "llama3.2",
                "base_url": "http://localhost:11434",
                "priority": 10,
            },
        )
        assert create_resp.status_code == 201
        prov_id = create_resp.json()["id"]
        assert create_resp.json()["name"] == "Local Ollama Llama3"

        # 2. List Providers
        list_resp = await client.get("/api/v1/admin/ai/providers", headers=headers)
        assert list_resp.status_code == 200
        assert any(p["id"] == prov_id for p in list_resp.json())

        # 3. Test Provider Endpoint
        with patch.object(OllamaAdapter, "health_check", new_callable=AsyncMock, return_value=True):
            test_resp = await client.post(f"/api/v1/admin/ai/providers/{prov_id}/test", headers=headers)
            assert test_resp.status_code == 200
            assert test_resp.json()["healthy"] is True

        # 4. Get Task Routing
        route_resp = await client.get("/api/v1/admin/ai/routing", headers=headers)
        assert route_resp.status_code == 200
        assert len(route_resp.json()) == 5  # 5 standard tasks

        # 5. Set Task Routing Override
        set_route = await client.put(
            "/api/v1/admin/ai/routing/answer_evaluation",
            headers=headers,
            json={
                "primary_provider_id": prov_id,
                "is_active": True,
                "notes": "Fast local evaluation via Llama3",
            },
        )
        assert set_route.status_code == 200
        assert set_route.json()["primary_provider"]["id"] == prov_id

        # 6. Delete Provider
        del_resp = await client.delete(f"/api/v1/admin/ai/providers/{prov_id}", headers=headers)
        assert del_resp.status_code == 204


class TestResourceUploadAndExtraction:
    async def test_resource_upload_with_plain_text_extraction(self, client: AsyncClient):
        # Teacher creates course
        t_resp = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "teacher_upload@test.com",
                "password": "Password123!",
                "full_name": "Prof Upload",
                "role": "teacher",
            },
        )
        token = t_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        c_resp = await client.post(
            "/api/v1/courses",
            headers=headers,
            json={"title": "Cloud Computing", "code": "CS601"},
        )
        course_id = c_resp.json()["id"]

        # Upload a file
        file_content = b"Cloud Computing Overview:\nMicroservices and Serverless Architectures."
        files = {"file": ("cloud_notes.txt", io.BytesIO(file_content), "text/plain")}
        data = {
            "title": "Cloud Notes Week 1",
            "description": "Introductory notes",
            "tags": "cloud,serverless",
        }

        up_resp = await client.post(
            f"/api/v1/courses/{course_id}/resources/upload",
            headers=headers,
            data=data,
            files=files,
        )
        assert up_resp.status_code == 201
        res = up_resp.json()
        assert res["title"] == "Cloud Notes Week 1"
        assert res["type"] == "txt"
        assert "cloud" in res["tags"]
