# ==============================================================================
# ExamWise AI — Production Multi-Stage Dockerfile
# Stage 1: Build React + Vite TypeScript frontend
# Stage 2: Production Python FastAPI server (serving both API and Frontend)
# ==============================================================================

# ── Stage 1: Frontend Build ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# ── Stage 2: Backend & Runtime ────────────────────────────────────────────────
FROM python:3.11-slim AS production

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    APP_HOST=0.0.0.0 \
    APP_PORT=8000 \
    DATABASE_URL=sqlite+aiosqlite:///./examwise.db

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend /app/backend

# Copy built frontend assets from Stage 1 into /app/dist
COPY --from=frontend-builder /app/dist /app/dist

WORKDIR /app/backend

EXPOSE 8000

# Run FastAPI backend (which also serves the mounted frontend at /)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
