from __future__ import annotations

import httpx
import pytest
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ai.base import AITask
from app.services.ai.manager import AIProviderManager
from app.services.ai.ollama import OllamaAdapter


class QuestionPredictionOutput(BaseModel):
    topic: str
    difficulty: str
    predicted_questions: list[str]


@pytest.fixture
def live_adapter() -> OllamaAdapter:
    return OllamaAdapter(
        model_name=settings.ollama_model,
        base_url=settings.ollama_base_url,
        timeout_seconds=60.0,
    )


class TestLiveOllama:
    async def test_live_ollama_health_and_model_presence(self, live_adapter: OllamaAdapter):
        # Verify Ollama server responds and qwen3:1.7b is available
        is_healthy = await live_adapter.health_check()
        assert is_healthy is True, "Ollama server at http://localhost:11434 did not respond to health check"

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            assert resp.status_code == 200
            data = resp.json()
            model_names = [m.get("name") for m in data.get("models", [])]
            assert any(
                settings.ollama_model in name for name in model_names
            ), f"Model '{settings.ollama_model}' not found in installed Ollama models: {model_names}"

    async def test_live_ollama_direct_generation(self, live_adapter: OllamaAdapter):
        response = await live_adapter.generate(
            prompt="Define what an operating system kernel is in one short sentence.",
            temperature=0.2,
            max_tokens=512,
        )
        assert response.model_name == settings.ollama_model
        assert response.provider_type == "ollama"
        assert len(response.raw_text.strip()) > 10
        # Verify <think> tags were stripped
        assert "<think>" not in response.raw_text
        assert "</think>" not in response.raw_text

    async def test_live_ollama_structured_pydantic_output(self, db_session: AsyncSession):
        manager = AIProviderManager()

        prompt = (
            "Generate 2 high-priority exam questions for the topic 'Binary Search Trees'. "
            "Set difficulty to 'medium'."
        )

        validated, ai_resp = await manager.generate_structured(
            task=AITask.QUESTION_PREDICTION,
            prompt=prompt,
            schema=QuestionPredictionOutput,
            db=db_session,
            temperature=0.2,
        )

        assert isinstance(validated, QuestionPredictionOutput)
        assert len(validated.predicted_questions) >= 1
        assert validated.difficulty.lower() in ("easy", "medium", "hard")
        assert ai_resp.model_name == settings.ollama_model
        assert ai_resp.provider_type == "ollama"
