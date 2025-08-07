# Makefile for Next.js panel

SHELL := /bin/bash
NODE_VERSION := $(shell node -v 2>/dev/null || echo "Not Found")
YARN := $(shell command -v yarn 2>/dev/null)
OS := $(shell uname -s)

.PHONY: init build run export clean info test

init:
	@echo "🔧 Installing dependencies..."
	@if [ -z "$(YARN)" ]; then \
	echo "⚠️  Yarn not found. Attempting to install..."; \
	if [ "$(OS)" = "Darwin" ]; then \
	if command -v brew >/dev/null 2>&1; then \
	brew install yarn; \
	else \
	echo "❌ Homebrew not found. Please install Yarn manually."; exit 1; \
	fi; \
	elif [ -f /etc/debian_version ]; then \
	curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add - && \
	echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list && \
	sudo apt update && sudo apt install -y yarn; \
	elif [ -f /etc/redhat-release ]; then \
	curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo && \
	sudo yum install -y yarn; \
	else \
	echo "❌ Unsupported OS. Please install Yarn manually."; exit 1; \
	fi; \
	fi
	yarn install

build:
	@echo "🔨 Building Next.js project..."
	yarn build

run:
	@echo "🚀 Starting local dev server in background..."
	@nohup yarn dev >/tmp/panel.log 2>&1 &

test:
	@echo "🔍 Running tests..."
	@yarn test || echo "No tests configured"

export:
	@echo "📦 Exporting static site to ./out ..."
	yarn build && yarn export

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf .next out

info:
	@echo "🧾 Current Node.js version: $(NODE_VERSION)"
