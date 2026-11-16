from __future__ import annotations

import json
import re
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.config import settings
from app.models.ai_config import AIProviderConfig, AITaskRoutingOverride
from app.services.ai.anthropic import AnthropicAdapter
from app.services.ai.base import AITask, AIProviderType, AIResponse, BaseAIAdapter
from app.services.ai.crypto import decrypt_secret
from app.services.ai.gemini import GeminiAdapter
from app.services.ai.ollama import OllamaAdapter
from app.services.ai.openai import OpenAIAdapter

logger = structlog.get_logger()
T = TypeVar("T", bound=BaseModel)


class AIProviderManagerError(Exception):
    """Raised when no suitable AI provider is available or generation fails."""
    pass


class AIProviderManager:
    """
    Centralized AI Provider Manager.
    Handles task-based model routing, cloud-to-local fallback,
    health monitoring, and Pydantic-validated structured outputs.
    """

    def __init__(self) -> None:
        self._adapter_cache: dict[str, BaseAIAdapter] = {}

    def get_adapter_for_config(self, config: AIProviderConfig) -> BaseAIAdapter:
        cache_key = f"{config.id}_{config.updated_at}"
        if cache_key in self._adapter_cache:
            return self._adapter_cache[cache_key]

        api_key = decrypt_secret(config.encrypted_api_key) if config.encrypted_api_key else ""
        ptype = config.provider_type.lower()

        adapter: BaseAIAdapter
        if ptype == AIProviderType.OLLAMA.value:
            adapter = OllamaAdapter(
                model_name=config.model_name,
                base_url=config.base_url or settings.ollama_base_url,
                api_key=api_key,
            )
        elif ptype == AIProviderType.GEMINI.value:
            adapter = GeminiAdapter(
                model_name=config.model_name,
                base_url=config.base_url,
                api_key=api_key or settings.gemini_api_key,
            )
        elif ptype == AIProviderType.OPENAI.value:
            adapter = OpenAIAdapter(
                model_name=config.model_name,
                base_url=config.base_url,
                api_key=api_key or settings.openai_api_key,
            )
        elif ptype == AIProviderType.ANTHROPIC.value:
            adapter = AnthropicAdapter(
                model_name=config.model_name,
                base_url=config.base_url,
                api_key=api_key or settings.anthropic_api_key,
            )
        else:
            raise AIProviderManagerError(f"Unsupported provider type: {config.provider_type}")

        self._adapter_cache[cache_key] = adapter
        return adapter

    def get_default_fallback_adapter(self) -> BaseAIAdapter:
        """Create a default Ollama adapter when no DB configuration exists."""
        return OllamaAdapter(
            model_name=settings.ollama_model,
            base_url=settings.ollama_base_url,
        )

    async def resolve_adapter_chain(self, task: AITask | str, db: AsyncSession) -> list[BaseAIAdapter]:
        """
        Resolve the ordered list of adapters for a given task:
        [Primary, Fallback (if configured), Default Ollama]
        """
        task_str = task.value if isinstance(task, AITask) else str(task)
        chain: list[BaseAIAdapter] = []

        # 1. Check for routing override in DB
        res_override = await db.execute(
            select(AITaskRoutingOverride).where(
                AITaskRoutingOverride.task_type == task_str,
                AITaskRoutingOverride.is_active.is_(True),
            )
        )
        override = res_override.scalar_one_or_none()

        if override:
            if override.primary_provider_id:
                prim_conf = await db.get(AIProviderConfig, override.primary_provider_id)
                if prim_conf and prim_conf.is_enabled:
                    chain.append(self.get_adapter_for_config(prim_conf))
            if override.fallback_provider_id:
                fb_conf = await db.get(AIProviderConfig, override.fallback_provider_id)
                if fb_conf and fb_conf.is_enabled:
                    chain.append(self.get_adapter_for_config(fb_conf))

        # 2. If chain is empty, get active providers ordered by priority (lower priority number = first)
        if not chain:
            res_providers = await db.execute(
                select(AIProviderConfig)
                .where(AIProviderConfig.is_enabled.is_(True))
                .order_by(AIProviderConfig.priority.asc())
            )
            configs = res_providers.scalars().all()
            for conf in configs:
                chain.append(self.get_adapter_for_config(conf))

        # 3. If cloud API keys are present in environment, inject them
        if settings.gemini_api_key:
            chain.insert(
                0,
                GeminiAdapter(
                    model_name="gemini-1.5-flash",
                    api_key=settings.gemini_api_key,
                ),
            )

        # 4. Always ensure default Ollama adapter is present at the end of the chain
        chain.append(self.get_default_fallback_adapter())
        return chain

    async def generate(
        self,
        task: AITask | str,
        prompt: str,
        db: AsyncSession,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> AIResponse:
        """
        Execute generation with automatic provider fallback.
        """
        adapters = await self.resolve_adapter_chain(task, db)
        last_error: Exception | None = None

        for adapter in adapters:
            try:
                logger.info(
                    "Attempting AI generation",
                    task=str(task),
                    provider=adapter.__class__.__name__,
                    model=adapter.model_name,
                )
                response = await adapter.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                )
                return response
            except Exception as e:
                logger.warning(
                    "Provider generation failed, attempting next fallback",
                    provider=adapter.__class__.__name__,
                    model=adapter.model_name,
                    error=str(e),
                )
                last_error = e

        raise AIProviderManagerError(
            f"All AI providers in fallback chain failed for task '{task}'. Last error: {last_error}"
        )

    async def generate_structured(
        self,
        task: AITask | str,
        prompt: str,
        schema: type[T],
        db: AsyncSession,
        system_prompt: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> tuple[T, AIResponse]:
        """
        Generate structured output validated against a Pydantic schema model.
        """
        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        system_instruction = (
            (system_prompt or "You are an expert academic AI evaluation assistant.")
            + "\n\nCRITICAL: Return ONLY a valid JSON object matching the JSON schema below.\n"
            + "Output NO reasoning, internal thoughts, or think tags. Proceed immediately to the JSON response.\n"
            + "Do NOT wrap with markdown unless needed, and do not provide conversational preamble.\n"
            + f"JSON Schema:\n{schema_json}"
        )

        response = await self.generate(
            task=task,
            prompt=prompt,
            db=db,
            system_prompt=system_instruction,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=True,
        )

        clean_text = self._clean_json_markdown(response.raw_text)
        try:
            validated = schema.model_validate_json(clean_text)
            response.parsed = validated.model_dump()
            return validated, response
        except ValidationError as ve:
            logger.error("Structured AI output failed schema validation", raw=response.raw_text, error=str(ve))
            raise AIProviderManagerError(f"AI response failed schema validation: {ve}") from ve

    @staticmethod
    def _clean_json_markdown(text: str) -> str:
        text = text.strip()
        # Strip <think>...</think> from reasoning models (Qwen3, DeepSeek, etc.)
        text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
        # Remove ```json ... ``` markdown fence
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            return match.group(1).strip()
        return text


# Global singleton instance
ai_manager = AIProviderManager()
