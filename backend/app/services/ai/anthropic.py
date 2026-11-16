from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.services.ai.base import AIProviderType, AIResponse, BaseAIAdapter

logger = structlog.get_logger()


class AnthropicAdapter(BaseAIAdapter):
    """
    Adapter for Anthropic Claude models via Anthropic Messages API.
    """

    def __init__(
        self,
        model_name: str = "claude-3-5-sonnet-20241022",
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 60.0,
        **kwargs: Any,
    ) -> None:
        super().__init__(
            model_name=model_name,
            base_url=base_url or "https://api.anthropic.com",
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
        payload: dict[str, Any] = {
            "model": self.model_name,
            "max_tokens": max_tokens or 2048,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            payload["system"] = system_prompt
        if temperature is not None:
            payload["temperature"] = temperature

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        url = f"{self.base_url}/v1/messages"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        content_list = data.get("content", [])
        text = "".join(item.get("text", "") for item in content_list if item.get("type") == "text")
        usage = data.get("usage", {})

        return AIResponse(
            raw_text=text,
            model_name=self.model_name,
            provider_type=AIProviderType.ANTHROPIC.value,
            usage={
                "prompt_tokens": usage.get("input_tokens", 0),
                "completion_tokens": usage.get("output_tokens", 0),
            },
        )

    async def health_check(self) -> bool:
        if not self.api_key:
            return False
        return True
