#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${CANARY_ERROR_RATE_URL:-}" ]]; then
  echo "CANARY_ERROR_RATE_URL is not set"
  exit 1
fi

error_rate=$(curl -fsSL "$CANARY_ERROR_RATE_URL" | tr -d '[:space:]')
# Expected payload: decimal value, e.g. 0.0075

threshold="0.01"
awk -v rate="$error_rate" -v threshold="$threshold" 'BEGIN { exit !(rate+0 > threshold+0) }'
if [[ $? -eq 0 ]]; then
  echo "Canary error rate ${error_rate} exceeded threshold ${threshold}"
  exit 1
fi

echo "Canary error rate ${error_rate} is healthy"
