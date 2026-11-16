from __future__ import annotations

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_uuid

# Supported AI task types
AI_TASKS = [
    "answer_evaluation",
    "question_prediction",
    "sample_paper_generation",
    "topic_analysis",
    "study_assistance",
]

# Supported provider types
PROVIDER_TYPES = ["ollama", "gemini", "openai_compatible", "anthropic_compatible"]


class AIProviderConfig(Base, TimestampMixin):
    __tablename__ = "ai_provider_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    provider_type: Mapped[str] = mapped_column(String(30), nullable=False)  # ollama | gemini | openai_compatible | anthropic_compatible
    base_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Fernet-encrypted API key — never returned in API responses
    encrypted_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=100, nullable=False)  # lower = higher priority
    max_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Health check cache (not authoritative — just a hint)
    last_health_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ok | error | unknown


class AITaskRoutingOverride(Base, TimestampMixin):
    __tablename__ = "ai_task_routing_overrides"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    task_type: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)  # one override per task
    primary_provider_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ai_provider_configs.id", ondelete="SET NULL"), nullable=True)
    fallback_provider_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("ai_provider_configs.id", ondelete="SET NULL"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
