from __future__ import annotations

import json
import os
from pathlib import Path
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, get_db, require_teacher
from app.core.config import settings
from app.models.course import Course, CourseEnrollment, CourseModule, LearningResource
from app.models.user import User
from app.schemas.course import (
    CourseCreate,
    CourseResponse,
    CourseUpdate,
    ModuleCreate,
    ModuleResponse,
    ModuleUpdate,
    ResourceCreate,
    ResourceResponse,
)
from app.services.document_extractor import DocumentExtractor

router = APIRouter()


def _format_course(course: Course, current_user: User, enrolled_count: int, modules_count: int) -> CourseResponse:
    instructor_name = course.teacher.full_name if course.teacher else "Instructor"
    return CourseResponse(
        id=course.id,
        title=course.title,
        code=course.code,
        description=course.description,
        department=course.department or course.subject_area,
        subject_area=course.subject_area or course.department,
        semester=course.semester,
        credits=course.credits,
        academic_year=course.academic_year,
        is_active=course.is_active,
        teacher_id=course.teacher_id,
        instructor=instructor_name,
        modules_count=modules_count,
        enrolled_students_count=enrolled_count,
        progress=0.0,
    )


@router.get("", response_model=list[CourseResponse])
async def list_courses(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    browse: bool = Query(default=False, description="Browse all available active courses"),
) -> list[CourseResponse]:
    query = select(Course).options(
        selectinload(Course.teacher),
        selectinload(Course.modules),
        selectinload(Course.enrollments),
    )

    if current_user.role == "teacher" and not browse:
        query = query.where(Course.teacher_id == current_user.id)
    elif current_user.role == "student" and not browse:
        # Enrolled courses
        enrolled_subq = select(CourseEnrollment.course_id).where(
            CourseEnrollment.student_id == current_user.id,
            CourseEnrollment.status == "active",
        )
        query = query.where(Course.id.in_(enrolled_subq))
    else:
        query = query.where(Course.is_active.is_(True))

    result = await db.execute(query)
    courses = result.scalars().all()

    response = []
    for c in courses:
        enrolled_count = len(c.enrollments)
        modules_count = len(c.modules)
        response.append(_format_course(c, current_user, enrolled_count, modules_count))
    return response


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CourseCreate,
    current_user: Annotated[User, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    if body.code:
        exist = await db.execute(select(Course).where(Course.code == body.code))
        if exist.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Course code '{body.code}' already exists")

    course = Course(
        id=str(uuid.uuid4()),
        teacher_id=current_user.id,
        title=body.title,
        code=body.code,
        description=body.description,
        department=body.department,
        subject_area=body.subject_area or body.department,
        semester=body.semester,
        credits=body.credits,
        academic_year=body.academic_year,
        is_active=True,
    )
    db.add(course)
    await db.commit()

    # Re-fetch with teacher loaded
    query = (
        select(Course)
        .options(selectinload(Course.teacher), selectinload(Course.modules), selectinload(Course.enrollments))
        .where(Course.id == course.id)
    )
    res = await db.execute(query)
    saved = res.scalar_one()
    return _format_course(saved, current_user, 0, 0)


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    query = (
        select(Course)
        .options(selectinload(Course.teacher), selectinload(Course.modules), selectinload(Course.enrollments))
        .where(Course.id == course_id)
    )
    result = await db.execute(query)
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return _format_course(course, current_user, len(course.enrollments), len(course.modules))


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    body: CourseUpdate,
    current_user: Annotated[User, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> CourseResponse:
    query = (
        select(Course)
        .options(selectinload(Course.teacher), selectinload(Course.modules), selectinload(Course.enrollments))
        .where(Course.id == course_id)
    )
    result = await db.execute(query)
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this course")

    if body.title is not None:
        course.title = body.title
    if body.code is not None:
        course.code = body.code
    if body.description is not None:
        course.description = body.description
    if body.department is not None:
        course.department = body.department
    if body.subject_area is not None:
        course.subject_area = body.subject_area
    if body.semester is not None:
        course.semester = body.semester
    if body.credits is not None:
        course.credits = body.credits
    if body.academic_year is not None:
        course.academic_year = body.academic_year
    if body.is_active is not None:
        course.is_active = body.is_active

    await db.commit()
    await db.refresh(course)
    return _format_course(course, current_user, len(course.enrollments), len(course.modules))


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: str,
    current_user: Annotated[User, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this course")

    await db.delete(course)
    await db.commit()


# ── Enrollments ─────────────────────────────────────────────────────────────

@router.post("/{course_id}/enroll", status_code=status.HTTP_201_CREATED)
async def enroll_course(
    course_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    course = await db.get(Course, course_id)
    if not course or not course.is_active:
        raise HTTPException(status_code=404, detail="Course not found or inactive")

    # Check already enrolled
    result = await db.execute(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.student_id == current_user.id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        if existing.status != "active":
            existing.status = "active"
            await db.commit()
        return {"status": "enrolled", "message": "Enrolled successfully"}

    enrollment = CourseEnrollment(
        id=str(uuid.uuid4()),
        course_id=course_id,
        student_id=current_user.id,
        status="active",
    )
    db.add(enrollment)
    await db.commit()
    return {"status": "enrolled", "message": "Enrolled successfully"}


@router.delete("/{course_id}/enroll", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_course(
    course_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(CourseEnrollment).where(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.student_id == current_user.id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if enrollment:
        await db.delete(enrollment)
        await db.commit()


# ── Modules ─────────────────────────────────────────────────────────────────

@router.get("/{course_id}/modules", response_model=list[ModuleResponse])
async def list_modules(
    course_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> list[ModuleResponse]:
    result = await db.execute(
        select(CourseModule)
        .options(selectinload(CourseModule.resources))
        .where(CourseModule.course_id == course_id)
        .order_by(CourseModule.order_index)
    )
    modules = result.scalars().all()
    response = []
    for m in modules:
        topics = json.loads(m.key_topics_json) if m.key_topics_json else []
        response.append(
            ModuleResponse(
                id=m.id,
                course_id=m.course_id,
                title=m.title,
                description=m.description,
                order=m.order_index,
                learning_hours=m.learning_hours,
                status=m.status,
                key_topics=topics,
                resource_count=len(m.resources),
            )
        )
    return response


@router.post("/{course_id}/modules", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    course_id: str,
    body: ModuleCreate,
    current_user: Annotated[User, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> ModuleResponse:
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if current_user.role != "admin" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Order calculation
    if body.order_index == 0:
        max_order_res = await db.execute(
            select(func.max(CourseModule.order_index)).where(CourseModule.course_id == course_id)
        )
        current_max = max_order_res.scalar() or 0
        order_idx = current_max + 1
    else:
        order_idx = body.order_index

    module = CourseModule(
        id=str(uuid.uuid4()),
        course_id=course_id,
        title=body.title,
        description=body.description,
        order_index=order_idx,
        learning_hours=body.learning_hours,
        status="not_started",
        key_topics_json=json.dumps(body.key_topics) if body.key_topics else None,
    )
    db.add(module)
    await db.commit()

    return ModuleResponse(
        id=module.id,
        course_id=module.course_id,
        title=module.title,
        description=module.description,
        order=module.order_index,
        learning_hours=module.learning_hours,
        status=module.status,
        key_topics=body.key_topics,
        resource_count=0,
    )


@router.patch("/modules/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: str,
    body: ModuleUpdate,
    current_user: Annotated[User, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> ModuleResponse:
    module = await db.get(CourseModule, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    course = await db.get(Course, module.course_id)
    if current_user.role != "admin" and course and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if body.title is not None:
        module.title = body.title
    if body.description is not None:
        module.description = body.description
    if body.order_index is not None:
        module.order_index = body.order_index
    if body.learning_hours is not None:
        module.learning_hours = body.learning_hours
    if body.status is not None:
        module.status = body.status
    if body.key_topics is not None:
        module.key_topics_json = json.dumps(body.key_topics)

    await db.commit()
    await db.refresh(module)

    topics = json.loads(module.key_topics_json) if module.key_topics_json else []
    return ModuleResponse(
        id=module.id,
        course_id=module.course_id,
        title=module.title,
        description=module.description,
        order=module.order_index,
        learning_hours=module.learning_hours,
        status=module.status,
        key_topics=topics,
        resource_count=0,
    )


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: str,
    current_user: Annotated[User, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> None:
    module = await db.get(CourseModule, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    course = await db.get(Course, module.course_id)
    if current_user.role != "admin" and course and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(module)
    await db.commit()


# ── Resources ───────────────────────────────────────────────────────────────

@router.get("/{course_id}/resources", response_model=list[ResourceResponse])
async def list_resources(
    course_id: str,
    current_user: CurrentUser,
    module_id: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[ResourceResponse]:
    query = (
        select(LearningResource)
        .options(selectinload(LearningResource.uploader))
        .where(LearningResource.course_id == course_id)
    )
    if module_id:
        query = query.where(LearningResource.module_id == module_id)
    if resource_type and resource_type != "all":
        query = query.where(LearningResource.resource_type == resource_type)

    result = await db.execute(query)
    resources = result.scalars().all()

    response = []
    for r in resources:
        if search:
            q = search.lower()
            t_match = q in r.title.lower()
            d_match = bool(r.description and q in r.description.lower())
            if not (t_match or d_match):
                continue

        tags = json.loads(r.tags_json) if r.tags_json else []
        file_size_str = f"{r.file_size_bytes // 1024} KB" if r.file_size_bytes else "0 KB"
        uploader_name = r.uploader.full_name if r.uploader else "Instructor"
        uploaded_date = r.created_at.strftime("%Y-%m-%d") if r.created_at else ""

        response.append(
            ResourceResponse(
                id=r.id,
                course_id=r.course_id,
                module_id=r.module_id,
                title=r.title,
                description=r.description,
                type=r.resource_type,
                file_size=file_size_str,
                uploaded_at=uploaded_date,
                uploaded_by=uploader_name,
                status=r.status,
                tags=tags,
                downloads_count=r.downloads_count,
                url=r.url,
            )
        )
    return response


@router.post("/{course_id}/resources", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    course_id: str,
    body: ResourceCreate,
    current_user: Annotated[User, Depends(require_teacher)],
    db: AsyncSession = Depends(get_db),
) -> ResourceResponse:
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    resource = LearningResource(
        id=str(uuid.uuid4()),
        course_id=course_id,
        module_id=body.module_id,
        uploader_id=current_user.id,
        title=body.title,
        description=body.description,
        resource_type=body.resource_type,
        file_path=body.file_path,
        url=body.url,
        status="ready",
        tags_json=json.dumps(body.tags) if body.tags else None,
        downloads_count=0,
    )
    db.add(resource)
    await db.commit()

    uploaded_date = resource.created_at.strftime("%Y-%m-%d") if resource.created_at else ""
    return ResourceResponse(
        id=resource.id,
        course_id=resource.course_id,
        module_id=resource.module_id,
        title=resource.title,
        description=resource.description,
        type=resource.resource_type,
        file_size="0 KB",
        uploaded_at=uploaded_date,
        uploaded_by=current_user.full_name,
        status=resource.status,
        tags=body.tags,
        downloads_count=0,
        url=resource.url,
    )


@router.post("/{course_id}/resources/upload", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    course_id: str,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str | None = Form(default=None),
    module_id: str | None = Form(default=None),
    tags: str | None = Form(default=None),
    current_user: Annotated[User, Depends(require_teacher)] = None,
    db: AsyncSession = Depends(get_db),
) -> ResourceResponse:
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    content = await file.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File exceeds maximum allowed size of {settings.max_upload_size_mb}MB")

    # Extract text if supported
    extracted_text = None
    suffix = Path(file.filename or "").suffix.lower()
    if suffix in DocumentExtractor.SUPPORTED_EXTENSIONS:
        try:
            extracted_text = DocumentExtractor.extract_text_from_bytes(content, file.filename or "doc")
        except Exception:
            extracted_text = None

    # Save file to upload directory
    os.makedirs(settings.upload_dir, exist_ok=True)
    res_id = str(uuid.uuid4())
    save_filename = f"{res_id}_{Path(file.filename or 'file').name}"
    save_path = os.path.join(settings.upload_dir, save_filename)
    with open(save_path, "wb") as f:
        f.write(content)

    tags_list = []
    if tags:
        try:
            parsed = json.loads(tags)
            if isinstance(parsed, list):
                tags_list = [str(t).strip() for t in parsed if str(t).strip()]
        except Exception:
            tags_list = [t.strip() for t in tags.split(",") if t.strip()]

    resource_type = suffix.lstrip(".") if suffix else "file"
    if resource_type not in ("pdf", "docx", "pptx", "txt", "notes"):
        resource_type = "pdf"

    resource = LearningResource(
        id=res_id,
        course_id=course_id,
        module_id=module_id,
        uploader_id=current_user.id,
        title=title,
        description=description,
        resource_type=resource_type,
        file_path=save_path,
        extracted_text=extracted_text,
        file_size_bytes=len(content),
        mime_type=file.content_type,
        status="ready",
        tags_json=json.dumps(tags_list) if tags_list else None,
        downloads_count=0,
    )
    db.add(resource)
    await db.commit()

    uploaded_date = resource.created_at.strftime("%Y-%m-%d") if resource.created_at else ""
    return ResourceResponse(
        id=resource.id,
        course_id=resource.course_id,
        module_id=resource.module_id,
        title=resource.title,
        description=resource.description,
        type=resource.resource_type,
        file_size=f"{len(content) // 1024} KB",
        uploaded_at=uploaded_date,
        uploaded_by=current_user.full_name,
        status=resource.status,
        tags=tags_list,
        downloads_count=0,
        url=None,
    )


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> None:
    resource = await db.get(LearningResource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if current_user.role != "admin" and resource.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this resource")

    await db.delete(resource)
    await db.commit()
