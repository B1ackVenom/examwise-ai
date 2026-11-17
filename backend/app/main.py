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
                # Seed users if not present
                session.add_all(users)
                await session.flush()

            # Seed real DYPIU study material courses & modules if missing
            existing_codes = (await session.execute(select(Course.code))).scalars().all()
            courses_to_seed = [
                {
                    "id": "crs-cse2001",
                    "code": "CSE2001",
                    "title": "Design and Analysis of Algorithms",
                    "department": "Computer Science & Engineering",
                    "semester": "Semester III",
                    "academic_year": "2025-26",
                    "description": "Algorithmic paradigms, asymptotic analysis, divide-and-conquer, dynamic programming, greedy strategies, and NP-completeness.",
                    "teacher_id": "user-tch-01",
                    "modules": [
                        ("Introduction & Asymptotic Complexity", "Algorithm definition, time and space complexity, Big-O, Omega, Theta, Master theorem."),
                        ("Divide & Conquer and Greedy Strategies", "Merge Sort, Quick Sort, Binary Search, Fractional Knapsack, Job Sequencing, Huffman Coding."),
                        ("Backtracking & Branch-and-Bound", "State space trees, N-Queens problem, Graph Coloring, Travelling Salesperson Problem."),
                        ("Dynamic Programming", "Principle of optimality, 0/1 Knapsack, Longest Common Subsequence, Matrix Chain Multiplication."),
                        ("Graph Algorithms & Shortest Paths", "Minimum Spanning Trees (Kruskal and Prim), Dijkstra algorithm, Floyd-Warshall."),
                        ("Problem Classification & NP-Completeness", "Tractable vs Intractable, P, NP, NP-Hard, NP-Complete, Cook-Levin theorem."),
                    ],
                },
                {
                    "id": "crs-cse2003",
                    "code": "CSE2003",
                    "title": "Database Management Systems",
                    "department": "Computer Science & Engineering",
                    "semester": "Semester III",
                    "academic_year": "2025-26",
                    "description": "Relational data models, E-R diagrams, relational algebra, SQL, normalization (1NF-BCNF), transactions, and concurrency.",
                    "teacher_id": "user-tch-01",
                    "modules": [
                        ("Introduction to Databases & RDBMS Architecture", "Three-tier schema architecture, Physical and Logical Data Independence, DBA responsibilities."),
                        ("Relational Data Model & E-R Modeling", "Entity sets, attributes, keys, Cardinality constraints, Weak entities, ER-to-Relational mapping."),
                        ("Relational Algebra & Structured Query Language", "Select, Project, Cartesian Product, Joins, Aggregate functions, Nested subqueries."),
                        ("Functional Dependencies & Normalization", "Armstrong axioms, Attribute closure, 1NF, 2NF, 3NF, BCNF, Lossless join decomposition."),
                        ("Transaction Management & Concurrency Control", "ACID properties, Conflict serializability, Two-Phase Locking (2PL), Deadlock handling."),
                    ],
                },
                {
                    "id": "crs-cse2104",
                    "code": "CSE2104",
                    "title": "Operating Systems",
                    "department": "Computer Science & Engineering",
                    "semester": "Semester IV",
                    "academic_year": "2025-26",
                    "description": "Process management, CPU scheduling, inter-process synchronization, deadlocks, virtual memory paging, and disk I/O.",
                    "teacher_id": "user-tch-01",
                    "modules": [
                        ("Foundations of Operating Systems", "Dual-mode operation (User vs Kernel), system calls execution, OS architecture, Linux shell."),
                        ("Linux & Process Management", "Process lifecycle, Process Control Block (PCB), Context switching, CPU scheduling algorithms."),
                        ("Process Synchronization & Deadlocks", "Critical section, Peterson algorithm, Semaphores, Classic synchronization, Banker algorithm."),
                        ("Memory Management & Virtual Memory", "Paging, Segmentation, TLB, Page faults, FIFO/LRU page replacement."),
                        ("File Systems & Disk Scheduling", "File concepts, Inodes, File allocation, Disk scheduling (FCFS, SSTF, SCAN, LOOK)."),
                    ],
                },
                {
                    "id": "crs-cs601",
                    "code": "CS-601",
                    "title": "Advanced Database Systems",
                    "department": "Computer Science & Engineering",
                    "semester": "Semester VI",
                    "academic_year": "2025-26",
                    "description": "Deep dive into relational query planning, distributed consensus, transactions, and vector indexing.",
                    "teacher_id": "user-tch-01",
                    "modules": [
                        ("Relational Query Optimization", "Cost-based query plans, join algorithms, and B+ tree indexing strategies."),
                        ("Transaction Management & Concurrency Control", "ACID guarantees, 2PL, MVCC, and snapshot isolation."),
                        ("Distributed & Parallel Databases", "Horizontal partitioning, Paxos/Raft consensus, 2PC protocols."),
                        ("NoSQL Architectures & Eventual Consistency", "LSM-trees, Dynamo-style hashing, and CAP theorem trade-offs."),
                        ("Modern In-Memory & Vector Databases", "Columnar storage, HNSW vector indexing, and real-time analytical engines."),
                    ],
                },
            ]

            for c_data in courses_to_seed:
                if c_data["code"] not in existing_codes:
                    c_obj = Course(
                        id=c_data["id"],
                        code=c_data["code"],
                        title=c_data["title"],
                        department=c_data["department"],
                        semester=c_data["semester"],
                        academic_year=c_data["academic_year"],
                        description=c_data["description"],
                        teacher_id=c_data["teacher_id"],
                    )
                    session.add(c_obj)
                    await session.flush()
                    for idx, (m_title, m_desc) in enumerate(c_data["modules"], start=1):
                        mod = CourseModule(
                            id=f"mod-{c_data['code'].lower()}-{idx}",
                            course_id=c_obj.id,
                            order_index=idx,
                            title=m_title,
                            description=m_desc,
                        )
                        session.add(mod)

            await session.commit()
            logger.info("Academic courses and modules verified/seeded successfully.")
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
