from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.services.ai.base import AIProviderType, AIResponse, BaseAIAdapter

logger = structlog.get_logger()


class OpenAIAdapter(BaseAIAdapter):
    """
    Adapter for OpenAI and OpenAI-compatible endpoints
    (OpenAI, vLLM, Together, Groq, Mistral, etc.).
    """

    def __init__(
        self,
        model_name: str = "gpt-4o-mini",
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 60.0,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            model_name=model_name,
            base_url=base_url or "https://api.openai.com/v1",
            api_key=api_key,
            **kwargs,
        )
        self.timeout = timeout_seconds

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
        }
        if temperature is not None:
            payload["temperature"] = temperature
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        url = f"{self.base_url}/chat/completions"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        choices = data.get("choices", [])
        text = choices[0].get("message", {}).get("content", "") if choices else ""
        usage = data.get("usage", {})

        return AIResponse(
            raw_text=text,
            model_name=self.model_name,
            provider_type=AIProviderType.OPENAI.value,
            usage={
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
            },
        )

    async def health_check(self) -> bool:
        if not self.api_key and "localhost" not in self.base_url:
            return False
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        url = f"{self.base_url}/models"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, headers=headers)
                return resp.status_code == 200
        except Exception as e:
            logger.debug("OpenAI health check failed", error=str(e))
            return False
