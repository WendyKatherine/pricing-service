#!/usr/bin/env bash
# deploy/deploy.sh — Remote deployment script for pricing-service
# Run on the OCI VM as user "deploy"
set -euo pipefail

SERVICE_DIR="/opt/pricing-service"
COMPOSE_FILE="${SERVICE_DIR}/docker-compose.prod.yml"
LOG_FILE="${SERVICE_DIR}/deploy.log"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
error(){ log "ERROR: $*"; exit 1; }

log "=== Deploy started ==="

cd "$SERVICE_DIR" || error "Directory $SERVICE_DIR not found"

log "Pulling latest images..."
docker compose -f "$COMPOSE_FILE" pull || error "Pull failed"

log "Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm pricing-api npm run migrate || error "Migration failed"

log "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d || error "Up failed"

log "Waiting for API readiness (DB connected)..."
for i in $(seq 1 12); do
  READY=$(curl -sf http://localhost:3001/ready 2>/dev/null || echo "")
  if echo "$READY" | grep -q '"db":"connected"'; then
    log "✓ API is ready (DB connected)"
    break
  fi
  if [ "$i" -eq 12 ]; then
    error "API not ready after 12 attempts — rolling back"
    docker compose -f "$COMPOSE_FILE" down
    exit 1
  fi
  log "  attempt $i/12 — waiting..."
  sleep 5
done

log "Cleaning old images..."
docker image prune -f --filter "until=24h"

log "=== Deploy complete ==="
