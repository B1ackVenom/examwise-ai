#!/usr/bin/env bash
# ==============================================================================
# ExamWise AI — Unified Local Demo Runner
# Starts the FastAPI backend and Vite frontend with unified logging & clean shutdown.
# Usage:
#   ./start.sh
#   or
#   bash start.sh
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/backend"
BACKEND_VENV="${BACKEND_DIR}/.venv"

# Text styles
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "================================================================================"
echo "                   EXAMWISE AI — LOCAL DEMO ENVIRONMENT                         "
echo "================================================================================"
echo -e "${NC}"

# ── 1. Check Python virtual environment ──────────────────────────────────────
if [ ! -d "${BACKEND_VENV}" ]; then
  echo -e "${RED}[ERROR] Backend virtualenv not found at ${BACKEND_VENV}.${NC}"
  echo "Please set up the backend virtual environment first:"
  echo "  cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi
echo -e "${GREEN}[✓] Python virtualenv detected: ${BACKEND_VENV}${NC}"

# ── 2. Check Node.js & node_modules ──────────────────────────────────────────
if [ ! -d "${PROJECT_ROOT}/node_modules" ]; then
  echo -e "${YELLOW}[!] node_modules not found. Installing frontend dependencies...${NC}"
  npm install --legacy-peer-deps
fi
echo -e "${GREEN}[✓] Frontend dependencies verified.${NC}"

# ── 3. Check Ollama server & qwen3:1.7b model ─────────────────────────────────
OLLAMA_RUNNING=0
if "${BACKEND_VENV}/bin/python" -c "import urllib.request; urllib.request.urlopen('http://localhost:11434/api/tags', timeout=1)" 2>/dev/null; then
  OLLAMA_RUNNING=1
  TAGS_OUTPUT=$("${BACKEND_VENV}/bin/python" -c "import urllib.request; print(urllib.request.urlopen('http://localhost:11434/api/tags', timeout=2).read().decode())" 2>/dev/null || echo "")
  if echo "${TAGS_OUTPUT}" | grep -q "qwen3:1.7b"; then
    echo -e "${GREEN}[✓] Ollama server is running (Model 'qwen3:1.7b' detected).${NC}"
  else
    echo -e "${YELLOW}[!] Ollama is running, but 'qwen3:1.7b' was not found in tags.${NC}"
    echo "    To pull the recommended model, run: ollama pull qwen3:1.7b"
  fi
else
  echo -e "${YELLOW}[!] Notice: Ollama server is not running on http://localhost:11434.${NC}"
  echo "    Local AI question prediction & auto-grading will fall back or wait."
  echo "    To enable local LLM inference, start Ollama: 'ollama serve' in another terminal."
fi

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# ── 4. Process Cleanup on Exit ───────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo -e "${YELLOW}[*] Shutting down ExamWise AI services cleanly...${NC}"
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
  # Kill any stray processes on target ports
  fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
  fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true
  echo -e "${GREEN}[✓] All services stopped. Goodbye!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ── 5. Clean up any existing listeners or Jarvis on port 8000 ─────────────────
if fuser "${BACKEND_PORT}/tcp" > /dev/null 2>&1 || pgrep -f openjarvis > /dev/null 2>&1; then
  echo -e "${YELLOW}[*] Existing service/Jarvis detected on port ${BACKEND_PORT}. Terminating...${NC}"
  fuser -k "${BACKEND_PORT}/tcp" 2>/dev/null || true
  pkill -f openjarvis 2>/dev/null || true
  sleep 1
  echo -e "${GREEN}[✓] Port ${BACKEND_PORT} successfully freed for ExamWise AI.${NC}"
fi
fuser -k "${FRONTEND_PORT}/tcp" 2>/dev/null || true

# ── 6. Start FastAPI Backend ─────────────────────────────────────────────────
echo -e "${CYAN}[*] Starting FastAPI Backend on http://0.0.0.0:${BACKEND_PORT} ...${NC}"
cd "${BACKEND_DIR}"
"${BACKEND_VENV}/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" > "${PROJECT_ROOT}/backend.log" 2>&1 &
BACKEND_PID=$!
cd "${PROJECT_ROOT}"

# Wait for backend to be ready
echo -n "    Waiting for backend health check..."
RETRIES=15
READY=0
while [ ${RETRIES} -gt 0 ]; do
  if "${BACKEND_VENV}/bin/python" -c "import socket; s = socket.socket(); s.settimeout(0.5); s.connect(('127.0.0.1', int('${BACKEND_PORT}'))); s.close()" 2>/dev/null; then
    READY=1
    break
  fi
  sleep 1
  echo -n "."
  RETRIES=$((RETRIES - 1))
done
echo ""

if [ ${READY} -eq 1 ]; then
  echo -e "${GREEN}[✓] FastAPI Backend is live at http://localhost:${BACKEND_PORT}${NC}"
else
  echo -e "${RED}[ERROR] Backend failed to start within 15 seconds. Check backend.log:${NC}"
  tail -n 20 "${PROJECT_ROOT}/backend.log"
  exit 1
fi

# ── 7. Start Vite Frontend ───────────────────────────────────────────────────
echo -e "${CYAN}[*] Starting Vite Frontend on http://localhost:${FRONTEND_PORT} ...${NC}"
npm run dev > "${PROJECT_ROOT}/frontend.log" 2>&1 &
FRONTEND_PID=$!

sleep 2

# ── 8. Demonstration Summary Banner ──────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}================================================================================"
echo "                   EXAMWISE AI IS READY FOR DEMONSTRATION!                      "
echo -e "================================================================================${NC}"
echo ""
echo -e "  ${BOLD}Web Application:${NC}           ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "  ${BOLD}Interactive API Docs:${NC}      ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC}"
echo -e "  ${BOLD}Health Endpoint:${NC}           ${CYAN}http://localhost:${BACKEND_PORT}/health${NC}"
if [ ${OLLAMA_RUNNING} -eq 1 ]; then
  echo -e "  ${BOLD}Local AI Engine:${NC}           ${GREEN}Active on http://localhost:11434 (qwen3:1.7b)${NC}"
else
  echo -e "  ${BOLD}Local AI Engine:${NC}           ${YELLOW}Offline (Start 'ollama serve' to activate)${NC}"
fi
echo ""
echo -e "  ${BOLD}Pre-configured Demo Accounts:${NC}"
echo -e "  ----------------------------------------------------------------------------"
echo -e "  Role                 Email                       Password"
echo -e "  ----------------------------------------------------------------------------"
echo -e "  ${CYAN}Faculty Examiner${NC}     teacher@examwise.edu        password123"
echo -e "  ${GREEN}Student${NC}              student@examwise.edu        password123"
echo -e "  ${YELLOW}Platform Admin${NC}       admin@examwise.ai           Admin123!"
echo -e "  ----------------------------------------------------------------------------"
echo ""
echo -e "  ${BOLD}Pre-loaded Academic Content:${NC}"
echo -e "  Course: ${BOLD}CS-601: Advanced Database Systems${NC} (5 Modules, Notes & Rubrics)"
echo ""
echo -e "  Logs: ${CYAN}backend.log${NC} and ${CYAN}frontend.log${NC}"
echo -e "  ${YELLOW}Press Ctrl+C anytime to stop all services.${NC}"
echo -e "${GREEN}================================================================================${NC}"
echo ""

# Keep script running and wait for background jobs
wait "${BACKEND_PID}" "${FRONTEND_PID}"
