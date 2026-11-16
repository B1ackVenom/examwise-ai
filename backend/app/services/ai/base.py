from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class AITask(str, Enum):
    ANSWER_EVALUATION = "answer_evaluation"
    QUESTION_PREDICTION = "question_prediction"
    SAMPLE_PAPER_GENERATION = "sample_paper_generation"
    TOPIC_ANALYSIS = "topic_analysis"
    STUDY_ASSISTANCE = "study_assistance"


class AIProviderType(str, Enum):
    OLLAMA = "ollama"
    GEMINI = "gemini"
    OPENAI = "openai_compatible"
    ANTHROPIC = "anthropic_compatible"


class AIResponse(BaseModel):
    raw_text: str
    parsed: Any | None = None
    model_name: str
    provider_type: str
    usage: dict[str, int] = {}


class BaseAIAdapter(ABC):
    """Abstract base class for all AI provider adapters."""

    def __init__(self, model_name: str, base_url: str | None = None, api_key: str | None = None, **kwargs: Any) -> None:
        self.model_name = model_name
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key or ""
        self.extra_config = kwargs

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> AIResponse:
        """Generate response text from LLM."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Perform health check to verify availability."""
        pass
