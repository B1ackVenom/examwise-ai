<div align="center">

# 🎓 ExamWise AI
### The Enterprise Academic Assessment Platform That Never Sleeps on Quality.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-examwise--ai.onrender.com-00C7B7?style=for-the-badge&logo=render&logoColor=white)](https://examwise-ai.onrender.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Python 3.11](https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Docker Ready](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)
[![Tests Passing](https://img.shields.io/badge/Tests-54%2F54%20Passing-success?style=for-the-badge&logo=pytest&logoColor=white)](backend/tests)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

**Say goodbye to arbitrary grading, spreadsheet arithmetic nightmares, and lazy multiple-choice hallucinations.**  
ExamWise AI is a full-stack, university-grade assessment operating system built for rigorous engineering curricula. It fuses **Deterministic NLP Vector Space Models** with **Generative LLMs** to deliver mathematically verified grading, Bloom's cognitive taxonomy balance, and predictive student risk analytics.

[Explore The Live Demo 🌐](https://examwise-ai.onrender.com) • [Quickstart Guide ⚡](#-1-click-local-demo) • [AIML Architecture 🧠](#-aiml-capstone-engineering--mathematical-engines) • [API Documentation 📖](#-rest-api-architecture)

</div>

---

## ⚡ Live Cloud Deployment

> **Experience ExamWise AI live in production right now:**  
> 🔗 **[https://examwise-ai.onrender.com](https://examwise-ai.onrender.com)**  
> *(Note: Render's free tier gracefully spins down after inactivity. Give it ~30 seconds on cold start to boot its engines!)*

### 🔑 Test-Drive Credentials

Skip sign-up friction—use these pre-seeded institutional accounts or click the demo buttons on the login screen:

| Role | Email | Password | What You Can Flex & Test |
|:---|:---|:---|:---|
| 👨‍🏫 **Faculty Examiner** | `teacher@examwise.edu` | `password123` | Syllabus-bound Exam Builder, Dual-Engine Evaluation Workbench, Marksheet Verifier, Bloom's Analytics |
| 🧑‍🎓 **Student Scholar** | `student@examwise.edu` | `password123` | Cornell Active Recall Notes, AI Practice Paper Generator, Predictive Performance Risk Dashboard |
| 🛡️ **Platform Admin** | `admin@examwise.ai` | `Admin123!` | Multi-Provider AI Config (Ollama / Gemini / OpenAI / Anthropic), System Audit Ledger |

---

## 💅 Why ExamWise AI Hits Different

Most "AI exam tools" are just flimsy wrappers around a ChatGPT prompt that churn out low-effort multiple-choice quizzes and hallucinate marks when grading descriptive answers. 

**ExamWise AI plays by real academic rules:**

- 🚫 **Zero-MCQ University Rigor:** Mid-Term (20–25M) and End-Term (50M) university papers are strictly structured into descriptive, analytical questions. No trivial guessing games.
- 📐 **Syllabus Module Partitioning:** Every single mark is mathematically balanced across curriculum modules (e.g. exactly 10 marks per module across all 5 units for End-Term).
- ⚖️ **Dual-Engine Hybrid Grading:** Combines sublinear TF-IDF vector space cosine similarity with generative rubric evaluation. Teachers see exact keyword coverage and deterministic confidence scores.
- 🔮 **Early Intervention Risk Forecaster:** Multivariate predictive machine learning classifies students into actionable intervention tiers before exams hit.
- 📜 **Cryptographic Audit Accountability:** Every single point changed on a student marksheet is logged into an immutable audit trail with actor IDs and timestamp verification.

---

## 🧠 AIML Capstone Engineering & Mathematical Engines

ExamWise AI isn't just an interface; it houses a battle-tested Machine Learning and Natural Language Processing pipeline:

```
                      ┌───────────────────────────────────────────────┐
                      │           Student Descriptive Answer          │
                      └───────────────────────┬───────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │ Deterministic NLP Core  │                     │   Generative Evaluator  │
         │ (TF-IDF & Root Stemming)│                     │  (Gemini Flash / Qwen)  │
         └────────────┬────────────┘                     └────────────┬────────────┘
                      │                                               │
             Cosine Similarity:                              Semantic Rubric Score:
    cos(θ) = (u · v) / (||u|| ||v||)                       Criteria-by-criteria match
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              ▼
                                 ┌─────────────────────────┐
                                 │   Hybrid Mark Blending  │
                                 │   40% NLP  +  60% LLM   │
                                 └────────────┬────────────┘
                                              ▼
                                 ┌─────────────────────────┐
                                 │ Explainable Evaluation  │
                                 │  + Concept Coverage Map │
                                 └─────────────────────────┘
```

### 1. Vector Space Cosine Similarity Engine
Student answers and faculty reference solutions undergo tokenization, punctuation stripping, stopword filtering, and morphological suffix stemming. We compute cosine similarity over sublinear Term Frequency ($1 + \ln(\text{tf})$) vectors:

$$\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$

### 2. Rubric Concept Coverage Recall Matrix
Calculates deterministic key-concept hit rates:

$$\text{Recall}_{\text{rubric}} = \frac{|\mathcal{C}_{\text{student}} \cap \mathcal{C}_{\text{rubric}}|}{|\mathcal{C}_{\text{rubric}}|}$$

### 3. Revised Bloom's Taxonomy Cognitive Depth Classifier
Extracts syntactic action verbs and maps query complexity to cognitive levels:
- **LOTS (Lower-Order Thinking Skills):** *Remember, Understand, Apply*
- **HOTS (Higher-Order Thinking Skills):** *Analyze, Evaluate, Create*  
Ensures exam papers conform to institutional accreditation criteria (NBA / ABET / NAAC).

### 4. Supervised Student At-Risk Predictive Forecaster
Extracts a multi-variate feature vector:
$$\mathbf{x} = [\text{practice\_avg}, \text{weak\_topics\_count}, \text{completion\_velocity}, \text{notebook\_engagement}]$$

Forecasts final score distributions and segments students into prescriptive academic risk tiers:
- 🚨 `HIGH_RISK` ($<45\%$): Triggers automated 1-on-1 faculty review and prerequisite foundational drills.
- ⚠️ `MODERATE_RISK` ($45\%–70\%$): Prescribes targeted weak module revision.
- 🎯 `EXAM_READY` ($>70\%$): Unlocks timed mock simulations for honors distinction.

---

## 🛠️ Tech Stack & Architecture

### Backend & AI Infrastructure
- **FastAPI (Python 3.11):** High-throughput asynchronous REST API with auto-generated OpenAPI 3.1 documentation.
- **SQLite with WAL Mode:** Configured with Write-Ahead Logging (`PRAGMA journal_mode=WAL; synchronous=NORMAL; busy_timeout=10000;`) for zero-lock concurrency.
- **Provider-Agnostic LLM Engine:** Seamless multi-provider runtime dynamically supporting:
  - 🌐 **Google Gemini 1.5 Flash** (Ultra-fast remote cloud inference with zero latency bottlenecks)
  - 💻 **Ollama (Qwen 2.5 / 3:1.7b)** (100% offline, privacy-first local hardware inference)
  - 🤖 **OpenAI & Anthropic Adapters** (Pluggable via admin console)
- **PyMuPDF (fitz):** Native multi-document PDF extraction for course syllabi and lecture slides.

### Frontend Application
- **React 19 & TypeScript:** State-of-the-art component architecture styled with Tailwind CSS.
- **Dual-Mode API Client:** Transparent fallback system ensuring fluid UI interactions whether connected to live FastAPI endpoints or standalone offline mode.
- **Lucide Icons & Framer Motion:** Fluid micro-interactions and dark/light responsive design.

---

## 🚀 1-Click Local Demo

Clone the repository and fire up the full ecosystem in seconds:

```bash
git clone https://github.com/B1ackVenom/examwise-ai-updated.git
cd examwise-ai-updated

# Run the turnkey demo script (frees port 8000, initializes DB, launches both servers)
./start.sh
```

Or using npm:
```bash
npm run demo
```

The script will automatically:
1. Verify the Python virtual environment and frontend dependencies.
2. Check if local Ollama is active on `http://localhost:11434` (falls back cleanly if unavailable).
3. Initialize SQLite schemas and seed `CS-601: Advanced Database Systems` with 5 full modules.
4. Launch FastAPI on `http://localhost:8000` and React on `http://localhost:3000`.

---

## 🧪 Comprehensive Test Suite

ExamWise AI is thoroughly tested across every layer—authentication, syllabus parsing, exam generation, AI adapters, and hybrid grading:

```bash
cd backend
.venv/bin/pytest tests/ -v
```

```
============================== 54 passed in 4.99s ==============================
```

- ✅ `test_aiml_capstone_features.py`: Hybrid grading, Bloom's cognitive taxonomy, and ML at-risk predictor.
- ✅ `test_exam_formats_and_multidoc.py`: Mid-Term & End-Term 0-MCQ validation and syllabus extraction.
- ✅ `test_teacher_evaluation_and_results.py`: Evaluation workbench, marksheet auto-calculation, and tamper-proof audits.
- ✅ `test_ai_infrastructure.py`: Multi-provider failover and configuration encryption.
- ✅ `test_auth.py` & `test_security.py`: JWT authentication, bcrypt hashing, and RBAC authorization.

---

## 📖 REST API Architecture

Explore the full interactive documentation at `http://localhost:8000/docs` or `https://examwise-ai.onrender.com/docs`.

| Endpoint Group | Route | Purpose |
|:---|:---|:---|
| **Auth** | `POST /api/v1/auth/login` | Secure JWT token issuance with role-based claims |
| **Courses** | `GET /api/v1/courses` | Retrieve courses, enrolled students, and syllabus modules |
| **Exams** | `POST /api/v1/exams/generate` | AI-assisted structured exam paper generation |
| **Evaluation** | `POST /api/v1/evaluation/evaluate` | Dual-engine hybrid NLP & LLM answer evaluation |
| **Marksheets** | `POST /api/v1/marksheets/{id}/verify` | Faculty marksheet verification & immutable audit signoff |
| **ML Predictor** | `GET /api/v1/performance-prediction` | Supervised ML performance & academic risk forecasting |
| **Notebooks** | `GET /api/v1/notebooks` | Cornell-format active recall study notebooks |
| **Audit** | `GET /api/v1/audit/logs` | Forensic tamper-evident evaluation change logs |

---

## 🚢 Continuous Deployment & 24/7 Keep-Alive

This repository includes:
- **Multi-Stage [Dockerfile](Dockerfile):** Compiles the React 19 frontend into static assets and mounts them directly through FastAPI under a single port 8000 container footprint.
- **GitHub Actions Keep-Alive Workflow ([.github/workflows/keep_alive.yml](.github/workflows/keep_alive.yml)):** Pings `/health` on a regular schedule to keep free-tier cloud instances awake during evaluation demos.

---

## 👨‍💻 Author & Capstone Credits

Developed with precision and passion by **Shreyas Patil** ([@B1ackVenom](https://github.com/B1ackVenom)).  
Built as an advanced AI & Machine Learning capstone project showcasing production LLM orchestration, verifiable academic evaluation, and modern full-stack web engineering.

---

<div align="center">
  <sub>Built for educators who care about rigor and students who deserve fairness.</sub><br/>
  <b><a href="https://examwise-ai.onrender.com">Launch ExamWise AI Live</a></b>
</div>
