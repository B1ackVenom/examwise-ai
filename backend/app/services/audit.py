from __future__ import annotations

import json
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEvent


async def record_audit_event(
    db: AsyncSession,
    action: str,
    actor_id: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    before: Any | None = None,
    after: Any | None = None,
    ip_address: str | None = None,
) -> AuditEvent:
    """
    Record an immutable audit event in the database.
    Audit events can never be modified or deleted.
    """
    before_json = None
    if before is not None:
        before_json = json.dumps(before, default=str) if not isinstance(before, str) else before

    after_json = None
    if after is not None:
        after_json = json.dumps(after, default=str) if not isinstance(after, str) else after

    event = AuditEvent(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_json=before_json,
        after_json=after_json,
        ip_address=ip_address,
    )
    db.add(event)
    await db.flush()
    return event
