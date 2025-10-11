SHELL := /bin/bash
PORT ?= 3001
DENO := $(shell command -v deno 2>/dev/null)
MAGICK := $(shell command -v magick 2>/dev/null || command -v convert 2>/dev/null)

.PHONY: icon prebuild dev build export start test lint clean info fetch-manifests check-deno

check-deno:
	@if [ -z "$(DENO)" ]; then \
		echo "❌ Deno not found. Please install it from https://deno.land/manual/getting_started/installation"; \
		exit 1; \
	fi

icon:
	@echo "🎨 Generating favicon and icon images..."
	@if [ -z "$(MAGICK)" ]; then \
		echo "❌ ImageMagick not found."; \
		if [ "$(shell uname -s)" = "Darwin" ]; then \
			echo "👉 Try: brew install imagemagick"; \
		elif [ -f /etc/debian_version ]; then \
			echo "👉 Try: sudo apt install imagemagick"; \
		elif [ -f /etc/redhat-release ]; then \
			echo "👉 Try: sudo dnf install imagemagick"; \
		fi; \
		exit 1; \
	fi
@mkdir -p static/icons
@$(MAGICK) ../logo.png -resize 32x32 static/icons/cloudnative_32.png
@$(MAGICK) ../logo.png -resize 64x64 -background none -define icon:auto-resize=64,48,32,16 static/favicon.ico
	@echo "✅ Icons generated successfully."

prebuild: check-deno
	deno task homepage:prebuild

fetch-manifests: check-deno
	deno task homepage:fetch-dl-index

dev: check-deno
	deno task homepage:dev -- -p $(PORT)

start: check-deno
	deno task homepage:start -- -p $(PORT)

build: check-deno
	deno task homepage:build

export: check-deno
	deno task homepage:export

test: check-deno
	deno task homepage:test

lint: check-deno
	deno task homepage:lint

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf .next out

info:
	@if [ -n "$(DENO)" ]; then \
		echo "🦕 $$(deno --version | tr '\n' ' ')"; \
	else \
		echo "❌ Deno not installed"; \
	fi
