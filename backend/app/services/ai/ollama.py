from __future__ import annotations

import json
import re
from typing import Any

import httpx
import structlog

from app.core.config import settings
from app.services.ai.base import AIProviderType, AIResponse, BaseAIAdapter

logger = structlog.get_logger()


class OllamaAdapter(BaseAIAdapter):
    """
    First-class adapter for Ollama local inference.
    Communicates via Ollama HTTP API (/api/chat).
    """

    def __init__(
        self,
        model_name: str | None = None,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            model_name=model_name or settings.ollama_model or "qwen3:1.7b",
            base_url=base_url or settings.ollama_base_url or "http://localhost:11434",
            api_key=api_key,
            **kwargs,
        )
        self.timeout = timeout_seconds if timeout_seconds is not None else settings.ollama_timeout_seconds

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> AIResponse:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload: dict[str, Any] = {
            "model": self.model_name,
            "messages": messages,
            "stream": False,
        }
        if json_mode:
            payload["format"] = "json"

        options: dict[str, Any] = {
            "num_ctx": settings.ollama_num_ctx,
            "num_thread": settings.ollama_num_thread,
        }
        if temperature is not None:
            options["temperature"] = temperature
        if max_tokens is not None:
            options["num_predict"] = max_tokens
        payload["options"] = options

        url = f"{self.base_url}/api/chat"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        content = data.get("message", {}).get("content", "").strip()
        # For reasoning/thinking models (like Qwen3 or DeepSeek-R1), strip <think> blocks
        cleaned_content = re.sub(r"<think>[\s\S]*?</think>", "", content).strip()
        final_text = cleaned_content if cleaned_content else content

        return AIResponse(
            raw_text=final_text,
            model_name=self.model_name,
            provider_type=AIProviderType.OLLAMA.value,
            usage={
                "prompt_tokens": data.get("prompt_eval_count", 0),
                "completion_tokens": data.get("eval_count", 0),
            },
        )

    async def health_check(self) -> bool:
        url = f"{self.base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url)
                return resp.status_code == 200
        except Exception as e:
            logger.debug("Ollama health check failed", error=str(e), url=url)
            return False
