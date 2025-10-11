#!/usr/bin/env bash
set -euo pipefail

# Ensure we run from repository root so relative sourcing works
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

source codex/env_deno_cache.sh

echo "📦 Pre-caching Deno dependencies into $DENO_DIR ..."

# 1️⃣ Deno 标准库
deno cache https://deno.land/std@0.224.0/http/server.ts

# 2️⃣ React + ReactDOM
deno cache npm:react@19.0.0 npm:react-dom@19.0.0

# 3️⃣ TailwindCSS
# 若未使用可注释掉
if grep -q '"tailwindcss"' ui/homepage/deno.json 2>/dev/null; then
  deno cache npm:tailwindcss@3.4.13
fi

echo "✅ Deno cache preloaded successfully into $DENO_DIR"
