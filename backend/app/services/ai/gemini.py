from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.services.ai.base import AIProviderType, AIResponse, BaseAIAdapter

logger = structlog.get_logger()


class GeminiAdapter(BaseAIAdapter):
    """
    Adapter for Google Gemini models via Gemini REST API.
    """

    def __init__(
        self,
        model_name: str = "gemini-1.5-flash",
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 60.0,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            model_name=model_name,
            base_url=base_url or "https://generativelanguage.googleapis.com",
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
        url = f"{self.base_url}/v1beta/models/{self.model_name}:generateContent"
        params = {"key": self.api_key}

        contents = [{"parts": [{"text": prompt}]}]
        body: dict[str, Any] = {"contents": contents}

        if system_prompt:
            body["system_instruction"] = {"parts": [{"text": system_prompt}]}

        gen_config: dict[str, Any] = {}
        if temperature is not None:
            gen_config["temperature"] = temperature
        if max_tokens is not None:
            gen_config["maxOutputTokens"] = max_tokens
        if json_mode:
            gen_config["responseMimeType"] = "application/json"
        if gen_config:
            body["generationConfig"] = gen_config

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, params=params, json=body)
            resp.raise_for_status()
            data = resp.json()

        candidates = data.get("candidates", [])
        if not candidates:
            return AIResponse(
                raw_text="",
                model_name=self.model_name,
                provider_type=AIProviderType.GEMINI.value,
            )

        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts)
        usage_meta = data.get("usageMetadata", {})

        return AIResponse(
            raw_text=text,
            model_name=self.model_name,
            provider_type=AIProviderType.GEMINI.value,
            usage={
                "prompt_tokens": usage_meta.get("promptTokenCount", 0),
                "completion_tokens": usage_meta.get("candidatesTokenCount", 0),
            },
        )

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        url = f"{self.base_url}/v1beta/models"
        params = {"key": self.api_key}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, params=params)
                return resp.status_code == 200
        except Exception as e:
            logger.debug("Gemini health check failed", error=str(e))
            return False
