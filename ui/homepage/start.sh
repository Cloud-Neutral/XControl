#!/bin/bash
set -euo pipefail

cd /var/www/XControl/ui/homepage

PORT="${PORT:-3000}"
export PORT

echo "🦕 Ensuring build artifacts are up to date"
deno task build

echo "🚀 Starting Aleph.js server with Deno runtime"
deno task start
