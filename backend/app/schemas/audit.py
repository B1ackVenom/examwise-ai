from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class AuditEventResponse(BaseModel):
    id: str
    actor_id: str | None = None
    actor_name: str | None = None
    actor_email: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: str | None = None
    before_state: dict[str, Any] | None = None
    after_state: dict[str, Any] | None = None
    ip_address: str | None = None
    created_at: str

    model_config = {"from_attributes": True}
