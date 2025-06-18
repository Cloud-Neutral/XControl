# Makefile for Next.js on macOS

# Node.js 版本校验（可选）
NODE_VERSION := $(shell node -v 2>/dev/null)
YARN := $(shell command -v yarn 2>/dev/null)

.PHONY: init build run export clean info

init:
@echo "🔧 Installing dependencies..."
ifeq ($(YARN),)
@echo "⚠️  Yarn not found. Installing via Homebrew..."
brew install yarn
endif
yarn install

build:
@echo "🔨 Building Next.js project..."
yarn build

run:
@echo "🚀 Starting local dev server..."
yarn dev

export:
@echo "📦 Exporting static site to ./out ..."
yarn build && yarn export

clean:
@echo "🧹 Cleaning build artifacts..."
rm -rf .next out

info:
@echo "🧾 Current Node.js version: $(NODE_VERSION)"

