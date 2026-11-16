from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db, require_teacher
from app.models.exam import Exam
from app.models.marksheet import MarksheetBatch, MarksheetRecord, PublishedResult
from app.models.user import User
from app.schemas.marksheet import (
    MarksheetBatchCreate,
    MarksheetBatchResponse,
    MarksheetRecordResponse,
    PublishedResultResponse,
)
from app.services.audit import record_audit_event

router = APIRouter()


async def _format_batch(b: MarksheetBatch, db: AsyncSession) -> MarksheetBatchResponse:
    exam = await db.get(Exam, b.exam_id)
    rec_responses = []

    for r in b.records:
        student = await db.get(User, r.student_id)
        breakdown = json.loads(r.breakdown_json) if r.breakdown_json else {}
        rec_responses.append(
            MarksheetRecordResponse(
                id=r.id,
                batch_id=r.batch_id,
                student_id=r.student_id,
                student_name=student.full_name if student else "",
                student_email=student.email if student else "",
                total_marks=r.total_marks,
                max_marks=r.max_marks,
                grade=r.grade,
                is_verified=r.is_verified,
                breakdown=breakdown,
            )
        )

    return MarksheetBatchResponse(
        id=b.id,
        exam_id=b.exam_id,
        exam_title=exam.title if exam else "",
        teacher_id=b.teacher_id,
        batch_name=b.batch_name,
        status=b.status,
        record_count=len(rec_responses),
        notes=b.notes,
        created_at=b.created_at.isoformat() if b.created_at else "",
        records=rec_responses,
    )


# ── Marksheet Batch Endpoints ────────────────────────────────────────────────

@router.get("/marksheets/batches", response_model=list[MarksheetBatchResponse])
async def list_marksheet_batches(
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    exam_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[MarksheetBatchResponse]:
    q = (
        select(MarksheetBatch)
        .options(selectinload(MarksheetBatch.records))
        .order_by(MarksheetBatch.created_at.desc())
    )
    if exam_id and exam_id != "all":
        q = q.where(MarksheetBatch.exam_id == exam_id)

    res = await db.execute(q)
    batches = res.scalars().all()
    return [await _format_batch(b, db) for b in batches]


@router.post("/marksheets/batches", response_model=MarksheetBatchResponse, status_code=status.HTTP_201_CREATED)
async def create_marksheet_batch(
    body: MarksheetBatchCreate,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> MarksheetBatchResponse:
    exam = await db.get(Exam, body.exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    batch = MarksheetBatch(
        id=str(uuid.uuid4()),
        exam_id=body.exam_id,
        teacher_id=current_user.id,
        batch_name=body.batch_name,
        status="pending",
        record_count=len(body.records),
        notes=body.notes,
    )
    db.add(batch)
    await db.flush()

    for item in body.records:
        rec = MarksheetRecord(
            id=str(uuid.uuid4()),
            batch_id=batch.id,
            student_id=item.student_id,
            total_marks=item.total_marks,
            max_marks=item.max_marks or exam.total_marks,
            grade=item.grade,
            is_verified=False,
            breakdown_json=json.dumps(item.breakdown),
        )
        db.add(rec)

    await db.commit()

    await record_audit_event(
        db=db,
        action="marksheet.batch_created",
        actor_id=current_user.id,
        entity_type="marksheet_batch",
        entity_id=batch.id,
        after={"batch_name": batch.batch_name, "records_count": len(body.records)},
    )
    await db.commit()

    q_fresh = (
        select(MarksheetBatch)
        .options(selectinload(MarksheetBatch.records))
        .where(MarksheetBatch.id == batch.id)
    )
    res_fresh = await db.execute(q_fresh)
    return await _format_batch(res_fresh.scalar_one(), db)


@router.get("/marksheets/batches/{batch_id}", response_model=MarksheetBatchResponse)
async def get_marksheet_batch(
    batch_id: str,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> MarksheetBatchResponse:
    q = (
        select(MarksheetBatch)
        .options(selectinload(MarksheetBatch.records))
        .where(MarksheetBatch.id == batch_id)
    )
    res = await db.execute(q)
    batch = res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Marksheet batch not found")
    return await _format_batch(batch, db)


@router.post("/marksheets/batches/{batch_id}/verify", response_model=MarksheetBatchResponse)
async def verify_marksheet_batch(
    batch_id: str,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> MarksheetBatchResponse:
    q = (
        select(MarksheetBatch)
        .options(selectinload(MarksheetBatch.records))
        .where(MarksheetBatch.id == batch_id)
    )
    res = await db.execute(q)
    batch = res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Marksheet batch not found")

    batch.status = "verified"
    for r in batch.records:
        r.is_verified = True

    await db.commit()

    await record_audit_event(
        db=db,
        action="marksheet.batch_verified",
        actor_id=current_user.id,
        entity_type="marksheet_batch",
        entity_id=batch.id,
        after={"status": "verified", "verified_records": len(batch.records)},
    )
    await db.commit()

    return await _format_batch(batch, db)


@router.post("/marksheets/batches/{batch_id}/publish", response_model=list[PublishedResultResponse])
async def publish_marksheet_batch_results(
    batch_id: str,
    current_user: Annotated[CurrentUser, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> list[PublishedResultResponse]:
    """
    Publish marksheet records to official PublishedResults.
    Ranks are automatically calculated based on total marks.
    Produces immutable AuditEvent.
    """
    q = (
        select(MarksheetBatch)
        .options(selectinload(MarksheetBatch.records))
        .where(MarksheetBatch.id == batch_id)
    )
    res = await db.execute(q)
    batch = res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Marksheet batch not found")
    if batch.status != "verified":
        raise HTTPException(status_code=400, detail="Batch must be verified before publishing results")

    exam = await db.get(Exam, batch.exam_id)
    now = datetime.now(timezone.utc)

    # Sort records descending by marks for ranking
    sorted_recs = sorted(batch.records, key=lambda x: (x.total_marks or 0.0), reverse=True)
    published_items: list[PublishedResult] = []

    for rank_idx, r in enumerate(sorted_recs, start=1):
        tot = r.total_marks or 0.0
        max_m = r.max_marks or (exam.total_marks if exam else 50)
        pct = round((tot / max_m) * 100, 2) if max_m > 0 else 0.0

        pub = PublishedResult(
            id=str(uuid.uuid4()),
            exam_id=batch.exam_id,
            student_id=r.student_id,
            total_marks=tot,
            max_marks=max_m,
            percentage=pct,
            grade=r.grade or ("A" if pct >= 80 else "B" if pct >= 60 else "C" if pct >= 40 else "F"),
            rank=rank_idx,
            published_at=now,
            published_by=current_user.id,
            breakdown_json=r.breakdown_json,
        )
        db.add(pub)
        published_items.append(pub)

    batch.status = "published"
    await db.commit()

    await record_audit_event(
        db=db,
        action="results.published",
        actor_id=current_user.id,
        entity_type="published_results",
        entity_id=batch.exam_id,
        after={"published_count": len(published_items), "batch_id": batch.id},
    )
    await db.commit()

    # Build response
    out: list[PublishedResultResponse] = []
    for p in published_items:
        student = await db.get(User, p.student_id)
        out.append(
            PublishedResultResponse(
                id=p.id,
                exam_id=p.exam_id,
                exam_title=exam.title if exam else "",
                student_id=p.student_id,
                student_name=student.full_name if student else "",
                total_marks=p.total_marks,
                max_marks=p.max_marks,
                percentage=p.percentage,
                grade=p.grade,
                rank=p.rank,
                published_at=p.published_at.isoformat(),
                breakdown=json.loads(p.breakdown_json) if p.breakdown_json else {},
            )
        )
    return out


# ── Published Results Endpoints (Student & Teacher Access) ────────────────────

@router.get("/results/my-results", response_model=list[PublishedResultResponse])
async def get_my_published_results(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[PublishedResultResponse]:
    """Student views their own published official examination results."""
    q = (
        select(PublishedResult)
        .where(PublishedResult.student_id == current_user.id)
        .order_by(PublishedResult.published_at.desc())
    )
    res = await db.execute(q)
    results = res.scalars().all()

    out: list[PublishedResultResponse] = []
    for p in results:
        exam = await db.get(Exam, p.exam_id)
        out.append(
            PublishedResultResponse(
                id=p.id,
                exam_id=p.exam_id,
                exam_title=exam.title if exam else "",
                student_id=p.student_id,
                student_name=current_user.full_name,
                total_marks=p.total_marks,
                max_marks=p.max_marks,
                percentage=p.percentage,
                grade=p.grade,
                rank=p.rank,
                published_at=p.published_at.isoformat(),
                breakdown=json.loads(p.breakdown_json) if p.breakdown_json else {},
            )
        )
    return out


@router.get("/results/exam/{exam_id}", response_model=list[PublishedResultResponse])
async def get_exam_published_results(
    exam_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[PublishedResultResponse]:
    """View published results for an exam. Students can only see their own result unless Teacher/Admin."""
    q = (
        select(PublishedResult)
        .where(PublishedResult.exam_id == exam_id)
        .order_by(PublishedResult.rank.asc())
    )
    if current_user.role == "student":
        q = q.where(PublishedResult.student_id == current_user.id)

    res = await db.execute(q)
    results = res.scalars().all()
    exam = await db.get(Exam, exam_id)

    out: list[PublishedResultResponse] = []
    for p in results:
        student = await db.get(User, p.student_id)
        out.append(
            PublishedResultResponse(
                id=p.id,
                exam_id=p.exam_id,
                exam_title=exam.title if exam else "",
                student_id=p.student_id,
                student_name=student.full_name if student else "",
                total_marks=p.total_marks,
                max_marks=p.max_marks,
                percentage=p.percentage,
                grade=p.grade,
                rank=p.rank,
                published_at=p.published_at.isoformat(),
                breakdown=json.loads(p.breakdown_json) if p.breakdown_json else {},
            )
        )
    return out
