# Makefile for src/homepage (Next.js static site)

SHELL := /bin/bash
NODE_VERSION := $(shell node -v 2>/dev/null)
YARN := $(shell command -v yarn 2>/dev/null)

.PHONY: init dev build export clean info

init:
	@echo "🔧 Installing dependencies for homepage..."
	@if [ -z "$(YARN)" ]; then \
		echo "⚠️  Yarn not found. Installing via Homebrew..."; \
		brew install yarn; \
	fi
	yarn install

dev:
	@echo "🚀 Starting Next.js dev server (homepage)..."
	yarn next dev -p 3001

build:
	@echo "🔨 Building homepage..."
	yarn next build

export:
	@echo "📦 Exporting homepage static site to ./out ..."
	yarn next build && yarn next export

clean:
	@echo "🧹 Cleaning .next and out directories..."
	rm -rf .next out

info:
	@echo "🧾 Node.js version: $(NODE_VERSION)"
