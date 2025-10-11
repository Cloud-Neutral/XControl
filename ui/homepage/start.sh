#!/bin/bash
set -euo pipefail

cd /var/www/XControl/ui/homepage

echo "🦕 Ensuring build artifacts are up to date"
deno task homepage:build

echo "🚀 Starting Next.js server with Deno runtime"
deno task homepage:start
