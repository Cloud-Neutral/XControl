# Simplified Makefile for XControl
GO=go
APP_NAME=xcontrol

UNAME_S := $(shell uname -s)
UNAME_M := $(shell uname -m)

.PHONY: all build agent vet test clean release \
       macos-x64 macos-arm64 windows-x64 linux-x64 linux-arm64 macos linux

all: vet test build

build:
$(GO) build -o bin/$(APP_NAME) ./cmd/api

agent:
$(GO) build -o bin/$(APP_NAME)-agent ./cmd/agent

vet:
$(GO) vet ./...

test:
$(GO) test ./...

clean:
rm -rf bin build

macos-x64:
@if [ "$(UNAME_S)" = "Darwin" ] && [ "$(UNAME_M)" = "x86_64" ]; then \
GOOS=darwin GOARCH=amd64 $(GO) build -o build/macos-x64/$(APP_NAME) ./cmd/api; \
else \
echo "macos-x64 build requires macOS x86_64"; \
fi

macos-arm64:
@if [ "$(UNAME_S)" = "Darwin" ] && [ "$(UNAME_M)" = "arm64" ]; then \
GOOS=darwin GOARCH=arm64 $(GO) build -o build/macos-arm64/$(APP_NAME) ./cmd/api; \
else \
echo "macos-arm64 build requires macOS arm64"; \
fi

windows-x64:
GOOS=windows GOARCH=amd64 $(GO) build -o build/windows-x64/$(APP_NAME).exe ./cmd/api

linux-x64:
GOOS=linux GOARCH=amd64 $(GO) build -o build/linux-x64/$(APP_NAME) ./cmd/api

linux-arm64:
GOOS=linux GOARCH=arm64 $(GO) build -o build/linux-arm64/$(APP_NAME) ./cmd/api

release: macos-x64 macos-arm64 windows-x64 linux-x64 linux-arm64

macos:
@if [ "$(UNAME_S)" = "Darwin" ]; then \
if [ "$(UNAME_M)" = "arm64" ]; then \
GOOS=darwin GOARCH=arm64 $(GO) build -o build/macos-arm64/$(APP_NAME) ./cmd/api; \
else \
GOOS=darwin GOARCH=amd64 $(GO) build -o build/macos-x64/$(APP_NAME) ./cmd/api; \
fi; \
else \
echo "macos build requires macOS host"; \
fi

linux:
@if [ "$(UNAME_S)" = "Linux" ]; then \
if [ "$(UNAME_M)" = "aarch64" ] || [ "$(UNAME_M)" = "arm64" ]; then \
GOOS=linux GOARCH=arm64 $(GO) build -o build/linux-arm64/$(APP_NAME) ./cmd/api; \
else \
GOOS=linux GOARCH=amd64 $(GO) build -o build/linux-x64/$(APP_NAME) ./cmd/api; \
fi; \
else \
echo "linux build requires Linux host"; \
fi
