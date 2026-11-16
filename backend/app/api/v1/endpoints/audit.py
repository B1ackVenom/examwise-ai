from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db, require_teacher
from app.models.audit import AuditEvent
from app.models.user import User
from app.schemas.audit import AuditEventResponse

router = APIRouter()


@router.get("/audit-events", response_model=list[AuditEventResponse])
async def list_audit_events(
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[AuditEventResponse]:
    """
    Query the immutable audit history.
    Accessible to teachers and administrators for compliance and grading transparency.
    """
    q = select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit)

    if action and action != "all":
        q = q.where(AuditEvent.action == action)
    if entity_type and entity_type != "all":
        q = q.where(AuditEvent.entity_type == entity_type)
    if entity_id:
        q = q.where(AuditEvent.entity_id == entity_id)

    res = await db.execute(q)
    events = res.scalars().all()

    out: list[AuditEventResponse] = []
    for ev in events:
        actor = await db.get(User, ev.actor_id) if ev.actor_id else None
        before = json.loads(ev.before_json) if ev.before_json else None
        after = json.loads(ev.after_json) if ev.after_json else None

        out.append(
            AuditEventResponse(
                id=ev.id,
                actor_id=ev.actor_id,
                actor_name=actor.full_name if actor else None,
                actor_email=actor.email if actor else None,
                action=ev.action,
                entity_type=ev.entity_type,
                entity_id=ev.entity_id,
                before_state=before,
                after_state=after,
                ip_address=ev.ip_address,
                created_at=ev.created_at.isoformat() if ev.created_at else "",
            )
        )
    return out
