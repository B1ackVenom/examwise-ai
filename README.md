# ExamWise AI — Academic Examination & Assessment Platform

Production-ready academic assessment platform featuring Cornell notes, AI-assisted descriptive exam generation, automated grading with immutable audit logging, and marksheet verification.

---

## Quick Start — Local Demonstration

To start both the **FastAPI backend** and the **React + Vite frontend** with a single command:

```bash
./start.sh
```
or
```bash
npm run demo
```

The script will automatically:
1. Verify the Python virtual environment (`backend/.venv`) and install frontend packages if needed.
2. Check if local Ollama is active on `http://localhost:11434` with `qwen3:1.7b`.
3. Auto-initialize the SQLite database schema and seed default users and courses.
4. Launch the FastAPI backend on `http://localhost:8000`.
5. Launch the React frontend on `http://localhost:3000`.
6. Provide graceful cleanup on `Ctrl+C`.

---

## Demonstration URLs & Portals

| Service | URL | Purpose |
|---|---|---|
| **Web Application** | [http://localhost:3000](http://localhost:3000) | Full Student & Teacher Web Interface |
| **Backend API Docs (Swagger UI)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI / Swagger UI |
| **API Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | System health & status check |
| **Ollama Local LLM** | `http://localhost:11434` | Local inference engine (`qwen3:1.7b`) |

---

## Pre-Configured Demo Accounts

Use these accounts to explore role-based capabilities:

| Role | Email | Password | Pre-loaded Workspace |
|---|---|---|---|
| **Faculty Examiner** | `teacher@examwise.edu` | `password123` | Exam Builder, Evaluation Workbench, Marksheet Verification, Results |
| **Student** | `student@examwise.edu` | `password123` | Cornell Notebooks, Question Predictor, Practice Papers, Analytics |
| **Platform Admin** | `admin@examwise.ai` | `Admin123!` | System Settings & AI Provider Configurations |

*Note: You can also use the Quick Login buttons on the sign-in screen.*

---

## Pre-Loaded Academic Data

On first boot, the platform auto-seeds:
* **Course:** `CS-601: Advanced Database Systems` (Semester VI, 2025-26)
* **5 Syllabus Modules:**
  1. *Relational Query Optimization* (Cost-based query plans, join algorithms, B+ tree indexing)
  2. *Transaction Management & Concurrency Control* (ACID, 2PL, MVCC, snapshot isolation)
  3. *Distributed & Parallel Databases* (Horizontal partitioning, Paxos/Raft consensus)
  4. *NoSQL Architectures & Eventual Consistency* (LSM-trees, Dynamo hashing, CAP theorem)
  5. *Modern In-Memory & Vector Databases* (Columnar storage, HNSW vector indexing)

---

## Exam Pattern Guidelines

Mid-Term and End-Term examinations strictly feature **zero MCQs**:
* **Mid-Term Exam (20–25 Marks, 60 mins):**
  * Module 1: 10 Marks (split as 5M+5M or 4M+6M)
  * Module 2: 10–15 Marks (e.g. 5M+5M or 5M+5M+5M)
* **End-Term Exam (50 Marks, 120 mins):**
  * Exactly 10 Marks max allocation across all 5 Modules (5 × 10M = 50 Marks)
  * Each module contains 2 sub-questions (5M+5M or 4M+6M)

---

## AIML Capstone Architecture & Mathematical Engines

In addition to local LLM inference via Ollama (`qwen3:1.7b`), ExamWise AI implements:

1. **Dual-Engine Hybrid Grading (Vector Space Model + Generative AI):**
   * Computes exact mathematical **Cosine Similarity** ($\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|\|\mathbf{v}\|}$) between student responses and reference answers in sublinear TF-IDF vector space with root stemming.
   * Calculates **Rubric Concept Coverage Recall** ($\text{Recall} = \frac{|\text{Matched Concepts}|}{|\text{Key Concepts}|}$).
   * Blends deterministic NLP metrics (40%) with LLM rubric reasoning (60%) for transparent, explainable scoring.
2. **Cognitive Depth & Bloom's Taxonomy Classifier:**
   * Syntactic action verb parsing and semantic hierarchy mapping across Bloom's 6 cognitive levels (*Remember, Understand, Apply, Analyze, Evaluate, Create*).
   * Automatically calculates LOTS vs. HOTS (Lower-Order vs. Higher-Order Thinking Skills) ratios.
3. **Supervised ML Performance Forecaster & Academic At-Risk Classifier:**
   * Feature vector extraction: `[practice_average, weak_topics_count, completion_velocity, notebook_engagement]`.
   * Real-time predictive scoring forecasting Mid-Term/End-Term exam scores ($0–100\%$) and classifying students into actionable risk tiers:
     * `HIGH_RISK` ($<45\%$): Immediate 1-on-1 tutoring and foundational revision.
     * `MODERATE_RISK` ($45–70\%$): Targeted weak module review.
     * `EXAM_READY` ($>70\%$): Distinction track with timed mock simulation.

---

## Manual Execution (Optional)

If you prefer starting services in separate terminal tabs:

### Backend Terminal
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Terminal
```bash
npm run dev
```

### Running Backend Tests
```bash
cd backend
.venv/bin/pytest tests/
```
