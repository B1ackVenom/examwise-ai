from __future__ import annotations

from pydantic import BaseModel, Field


class AIProviderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    provider_type: str = Field(default="ollama")  # ollama | gemini | openai_compatible | anthropic_compatible
    model_name: str = Field(min_length=1, max_length=100)
    base_url: str | None = None
    api_key: str | None = None
    is_enabled: bool = True
    priority: int = Field(default=100, ge=1, le=1000)
    max_tokens: int | None = Field(default=None, ge=1)
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)


class AIProviderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    model_name: str | None = Field(default=None, min_length=1, max_length=100)
    base_url: str | None = None
    api_key: str | None = None
    is_enabled: bool | None = None
    priority: int | None = Field(default=None, ge=1, le=1000)
    max_tokens: int | None = Field(default=None, ge=1)
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)


class AIProviderResponse(BaseModel):
    id: str
    name: str
    provider_type: str
    model_name: str
    base_url: str | None = None
    is_enabled: bool
    priority: int
    has_api_key: bool = False
    last_health_status: str | None = None
    max_tokens: int | None = None
    temperature: float | None = None

    model_config = {"from_attributes": True}


class TaskRoutingOverrideRequest(BaseModel):
    primary_provider_id: str | None = None
    fallback_provider_id: str | None = None
    is_active: bool = True
    notes: str | None = None


class TaskRoutingResponse(BaseModel):
    task_type: str
    primary_provider: AIProviderResponse | None = None
    fallback_provider: AIProviderResponse | None = None
    is_active: bool = True
    notes: str | None = None

    model_config = {"from_attributes": True}
