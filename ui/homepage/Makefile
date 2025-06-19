# Makefile for src/homepage (Next.js static site)

SHELL := /bin/bash
NODE_VERSION := $(shell node -v 2>/dev/null)
YARN := $(shell command -v yarn 2>/dev/null)

.PHONY: init dev build export clean info

icon:
	@echo "🎨 Generating favicon and icon images..."
	@if ! command -v magick &> /dev/null; then \
		echo "❌ ImageMagick (magick) not found. Please install it (e.g. brew install imagemagick)."; \
		exit 1; \
	fi
	@mkdir -p public/icons
	@magick ../logo.png -resize 32x32 public/icons/cloudnative_32.png
	@magick ../logo.png -resize 64x64 -background none -define icon:auto-resize=64,48,32,16 public/favicon.ico
	@echo "✅ Icons generated successfully."

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
	yarn next build

clean:
	@echo "🧹 Cleaning .next and out directories..."
	rm -rf .next out

info:
	@echo "🧾 Node.js version: $(NODE_VERSION)"

