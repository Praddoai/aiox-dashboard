#!/bin/bash
# dev-full.sh — Start engine + frontend Vite dev server
# Usage: ./scripts/dev-full.sh [--project-root /path]

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE_DIR="$SCRIPT_DIR/engine"
ENGINE_PORT=${ENGINE_PORT:-4002}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

# Parse args
PROJECT_ROOT=""
for arg in "$@"; do
  case "$arg" in
    --project-root=*) PROJECT_ROOT="${arg#*=}" ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
LIME='\033[38;2;209;255;0m'
NC='\033[0m'

cleanup() {
  echo -e "\n${CYAN}[aios]${NC} Shutting down..."
  if [ -n "$ENGINE_PID" ]; then
    kill "$ENGINE_PID" 2>/dev/null
    wait "$ENGINE_PID" 2>/dev/null
    echo -e "${CYAN}[aios]${NC} Engine stopped (PID $ENGINE_PID)"
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null
    wait "$FRONTEND_PID" 2>/dev/null
    echo -e "${CYAN}[aios]${NC} Frontend stopped (PID $FRONTEND_PID)"
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${LIME}╔═══════════════════════════════════╗${NC}"
echo -e "${LIME}║${NC}  AIOS Platform — Dev Mode         ${LIME}║${NC}"
echo -e "${LIME}╚═══════════════════════════════════╝${NC}"
echo ""

# Start engine
if lsof -i ":$ENGINE_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo -e "${GREEN}[aios]${NC} Engine already running on port $ENGINE_PORT"
else
  echo -e "${CYAN}[aios]${NC} Starting engine on port $ENGINE_PORT..."
  ENV_ARGS=""
  if [ -n "$PROJECT_ROOT" ]; then
    ENV_ARGS="AIOS_PROJECT_ROOT=$PROJECT_ROOT"
  fi
  cd "$ENGINE_DIR" && env $ENV_ARGS bun --watch src/index.ts &
  ENGINE_PID=$!

  # Wait for engine
  for i in $(seq 1 30); do
    if curl -s "http://localhost:$ENGINE_PORT/health" >/dev/null 2>&1; then
      echo -e "${GREEN}[aios]${NC} Engine ready on port $ENGINE_PORT"
      break
    fi
    if [ $i -eq 30 ]; then
      echo -e "${RED}[aios] Engine failed to start after 30s${NC}"
      cleanup
      exit 1
    fi
    sleep 1
  done
fi

# Start frontend
echo -e "${CYAN}[aios]${NC} Starting frontend on port $FRONTEND_PORT..."
cd "$SCRIPT_DIR" && npx vite --port $FRONTEND_PORT &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}[aios]${NC} Both servers running:"
echo -e "  Engine:    http://localhost:$ENGINE_PORT"
echo -e "  Dashboard: http://localhost:$FRONTEND_PORT"
echo -e "  Health:    http://localhost:$ENGINE_PORT/health"
echo -e "  Registry:  http://localhost:$ENGINE_PORT/registry/squads"
echo ""

wait
