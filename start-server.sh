#!/bin/bash
# Start local dev server with .env file (handles multiline values)
set -euo pipefail
cd /Users/dr/startups/featuresignals/server

# Load .env safely (handles quoted values with spaces)
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  # Remove surrounding quotes from value
  value="${value%\"}"
  value="${value#\"}"
  export "$key=$value"
done < .env

echo "EMAIL_PROVIDER=$EMAIL_PROVIDER"
echo "ZEPTOMAIL_TOKEN set: ${ZEPTOMAIL_TOKEN:+YES}"

exec go run ./cmd/server
