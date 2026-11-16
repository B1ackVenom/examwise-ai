from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequireAdmin, get_db
from app.models.ai_config import AI_TASKS, AIProviderConfig, AITaskRoutingOverride
from app.models.user import User
from app.schemas.ai_admin import (
    AIProviderCreate,
    AIProviderResponse,
    AIProviderUpdate,
    TaskRoutingOverrideRequest,
    TaskRoutingResponse,
)
from app.services.ai.crypto import encrypt_secret
from app.services.ai.manager import ai_manager

router = APIRouter()


def _format_provider(p: AIProviderConfig) -> AIProviderResponse:
    return AIProviderResponse(
        id=p.id,
        name=p.name,
        provider_type=p.provider_type,
        model_name=p.model_name,
        base_url=p.base_url,
        is_enabled=p.is_enabled,
        priority=p.priority,
        has_api_key=bool(p.encrypted_api_key),
        last_health_status=p.last_health_status,
        max_tokens=p.max_tokens,
        temperature=p.temperature,
    )


@router.get("/providers", response_model=list[AIProviderResponse])
async def list_providers(
    current_admin: RequireAdmin,
    db: AsyncSession = Depends(get_db),
) -> list[AIProviderResponse]:
    result = await db.execute(select(AIProviderConfig).order_by(AIProviderConfig.priority.asc()))
    providers = result.scalars().all()
    return [_format_provider(p) for p in providers]


@router.post("/providers", response_model=AIProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(
    body: AIProviderCreate,
    current_admin: RequireAdmin,
    db: AsyncSession = Depends(get_db),
) -> AIProviderResponse:
    exist = await db.execute(select(AIProviderConfig).where(AIProviderConfig.name == body.name))
    if exist.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Provider name '{body.name}' already exists")

    enc_key = encrypt_secret(body.api_key) if body.api_key else None

    provider = AIProviderConfig(
        id=str(uuid.uuid4()),
        name=body.name,
        provider_type=body.provider_type.lower(),
        model_name=body.model_name,
        base_url=body.base_url,
        encrypted_api_key=enc_key,
        is_enabled=body.is_enabled,
        priority=body.priority,
        max_tokens=body.max_tokens,
        temperature=body.temperature,
        last_health_status="unknown",
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return _format_provider(provider)


@router.get("/providers/{provider_id}", response_model=AIProviderResponse)
async def get_provider(
    provider_id: str,
    current_admin: RequireAdmin,
    db: AsyncSession = Depends(get_db),
) -> AIProviderResponse:
    p = await db.get(AIProviderConfig, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="AI Provider not found")
    return _format_provider(p)


@router.patch("/providers/{provider_id}", response_model=AIProviderResponse)
async def update_provider(
    provider_id: str,
    body: AIProviderUpdate,
    current_admin: RequireAdmin,
    db: AsyncSession = Depends(get_db),
) -> AIProviderResponse:
    p = await db.get(AIProviderConfig, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="AI Provider not found")

    if body.name is not None:
        p.name = body.name
    if body.model_name is not None:
        p.model_name = body.model_name
    if body.base_url is not None:
        p.base_url = body.base_url
    if body.api_key is not None:
        p.encrypted_api_key = encrypt_secret(body.api_key)
    if body.is_enabled is not None:
        p.is_enabled = body.is_enabled
    if body.priority is not None:
        p.priority = body.priority
    if body.max_tokens is not None:
        p.max_tokens = body.max_tokens
    if body.temperature is not None:
        p.temperature = body.temperature

    await db.commit()
    await db.refresh(p)
    return _format_provider(p)


@router.delete("/providers/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(
    provider_id: str,
    current_admin: RequireAdmin,
    db: AsyncSession = Depends(get_db),
) -> None:
    p = await db.get(AIProviderConfig, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="AI Provider not found")

    await db.delete(p)
    await db.commit()


@router.post("/providers/{provider_id}/test")
async def test_provider(
    provider_id: str,
    current_admin: RequireAdmin,
    db: AsyncSession = Depends(get_db),
) -> dict:
    p = await db.get(AIProviderConfig, provider_id)
    if not p:
        raise HTTPException(status_code=404, detail="AI Provider not found")

    adapter = ai_manager.get_adapter_for_config(p)
    healthy = await adapter.health_check()

    p.last_health_status = "ok" if healthy else "error"
    await db.commit()

    return {
        "provider_id": p.id,
        "name": p.name,
        "status": "ok" if healthy else "error",
        "healthy": healthy,
    }


# ── Routing Overrides ────────────────────────────────────────────────────────

@router.get("/routing", response_model=list[TaskRoutingResponse])
async def list_task_routing(
    current_admin: RequireAdmin,
    db: AsyncSession = Depends(get_db),
) -> list[TaskRoutingResponse]:
    result = await db.execute(select(AITaskRoutingOverride))
    overrides_map = {o.task_type: o for o in result.scalars().all()}

    providers_res = await db.execute(select(AIProviderConfig))
    providers_map = {p.id: _format_provider(p) for p in providers_res.scalars().all()}

    response = []
    for task_name in AI_TASKS:
        override = overrides_map.get(task_name)
        prim = providers_map.get(override.primary_provider_id) if override and override.primary_provider_id else None
        fb = providers_map.get(override.fallback_provider_id) if override and override.fallback_provider_id else None
        is_act = override.is_active if override else True
        notes = override.notes if override else None

        response.append(
            TaskRoutingResponse(
                task_type=task_name,
                primary_provider=prim,
                fallback_provider=fb,
                is_active=is_act,
                notes=notes,
            )
        )
    return response


@router.put("/routing/{task_type}", response_model=TaskRoutingResponse)
async def set_task_routing(
    task_type: str,
    body: TaskRoutingOverrideRequest,
    current_admin: RequireAdmin,
    db: AsyncSession = Depends(get_db),
) -> TaskRoutingResponse:
    if task_type not in AI_TASKS:
        raise HTTPException(status_code=400, detail=f"Invalid task_type '{task_type}'. Valid: {AI_TASKS}")

    result = await db.execute(
        select(AITaskRoutingOverride).where(AITaskRoutingOverride.task_type == task_type)
    )
    override = result.scalar_one_or_none()

    if not override:
        override = AITaskRoutingOverride(
            id=str(uuid.uuid4()),
            task_type=task_type,
            primary_provider_id=body.primary_provider_id,
            fallback_provider_id=body.fallback_provider_id,
            is_active=body.is_active,
            notes=body.notes,
        )
        db.add(override)
    else:
        override.primary_provider_id = body.primary_provider_id
        override.fallback_provider_id = body.fallback_provider_id
        override.is_active = body.is_active
        override.notes = body.notes

    await db.commit()
    await db.refresh(override)

    prim_conf = await db.get(AIProviderConfig, override.primary_provider_id) if override.primary_provider_id else None
    fb_conf = await db.get(AIProviderConfig, override.fallback_provider_id) if override.fallback_provider_id else None

    return TaskRoutingResponse(
        task_type=override.task_type,
        primary_provider=_format_provider(prim_conf) if prim_conf else None,
        fallback_provider=_format_provider(fb_conf) if fb_conf else None,
        is_active=override.is_active,
        notes=override.notes,
    )
