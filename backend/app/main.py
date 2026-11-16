from __future__ import annotations

import os
from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import select

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal
from app.core.security import hash_password
from app.models.base import Base
import app.models  # ensure all models are registered
from app.models.user import User
from app.models.course import Course, CourseModule

logger = structlog.get_logger()

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Create tables if not exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified/created successfully.")
    except Exception as e:
        logger.warning(f"Could not auto-create tables: {e}")

    # 2. Seed initial demo users & courses if DB is empty
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).limit(1))
            if not result.scalar_one_or_none():
                users = [
                    User(
                        id="usr-admin-01",
                        email="admin@examwise.ai",
                        full_name="Platform Admin",
                        hashed_password=hash_password("Admin123!"),
                        role="admin",
                        is_active=True,
                    ),
                    User(
                        id="user-tch-01",
                        email="teacher@examwise.edu",
                        full_name="Dr. Elena Mercer",
                        hashed_password=hash_password("password123"),
                        role="teacher",
                        is_active=True,
                    ),
                    User(
                        id="user-std-01",
                        email="student@examwise.edu",
                        full_name="Alex Morgan",
                        hashed_password=hash_password("password123"),
                        role="student",
                        is_active=True,
                    ),
                ]
                session.add_all(users)

                # Seed sample course with 5 modules
                sample_course = Course(
                    id="crs-cs601",
                    code="CS-601",
                    title="Advanced Database Systems",
                    department="Computer Science",
                    semester="Semester VI",
                    academic_year="2025-26",
                    description="Deep dive into relational query planning, distributed consensus, transactions, and indexing.",
                    teacher_id="user-tch-01",
                )
                session.add(sample_course)
                await session.flush()

                modules = [
                    CourseModule(
                        id=f"mod-cs601-{i}",
                        course_id=sample_course.id,
                        order_index=i,
                        title=title,
                        description=desc,
                    )
                    for i, (title, desc) in enumerate(
                        [
                            ("Relational Query Optimization", "Cost-based query plans, join algorithms, and B+ tree indexing strategies."),
                            ("Transaction Management & Concurrency Control", "ACID guarantees, 2PL, MVCC, and snapshot isolation."),
                            ("Distributed & Parallel Databases", "Horizontal partitioning, Paxos/Raft consensus, 2PC protocols."),
                            ("NoSQL Architectures & Eventual Consistency", "LSM-trees, Dynamo-style hashing, and CAP theorem trade-offs."),
                            ("Modern In-Memory & Vector Databases", "Columnar storage, HNSW vector indexing, and real-time analytical engines."),
                        ],
                        start=1,
                    )
                ]
                session.add_all(modules)
                await session.commit()
                logger.info("Default seed users and courses created successfully.")
    except Exception as e:
        logger.warning(f"Seed step skipped or failed: {e}")

    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="ExamWise AI",
        description="Production API for the ExamWise AI academic platform",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health", tags=["Health"])
    async def health() -> dict:
        return {"status": "ok", "version": "0.1.0"}

    # Mount built frontend static files if present (for single-container cloud deployment)
    dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../dist"))
    if not os.path.exists(dist_path):
        dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../dist"))
    if os.path.exists(dist_path):
        app.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")

    return app


app = create_app()
