#!/usr/bin/env bash
# 📦 Setup Deno cache environment for offline use

set -euo pipefail

export DENO_DIR=/data/update-server/deno/cache
mkdir -p "$DENO_DIR"
echo "✅ DENO_DIR set to: $DENO_DIR"
