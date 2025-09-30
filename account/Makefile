APP_NAME := xcontrol-account
MAIN_FILE := ./cmd/accountsvc/main.go
PORT ?= 8080
OS := $(shell uname -s)
ACCOUNT_DB_DSN ?= postgres://postgres:postgres@localhost:5432/account?sslmode=disable
SCHEMA_FILE := ./sql/schema.sql
export PATH := /usr/local/go/bin:$(PATH)

.PHONY: all init init-go init-db build start stop restart clean help dev test

all: build

init: init-go init-db

init-go:
	@echo ">>> 初始化 Go 依赖环境"
	@if command -v go >/dev/null 2>&1; then \
		echo "Go 已安装"; \
	else \
		echo "安装 Go"; \
		if [ "$(OS)" = "Darwin" ]; then \
			brew install go@1.24 && brew link --overwrite --force go@1.24; \
		else \
			sudo apt-get update && sudo apt-get install -y golang; \
		fi; \
	fi
	@if curl -s --max-time 5 https://goproxy.cn >/dev/null; then \
		echo "使用国内镜像: goproxy.cn"; \
		go env -w GOPROXY=https://goproxy.cn,direct; \
	else \
		echo "国内镜像不可用，使用默认: proxy.golang.org"; \
		go env -w GOPROXY=https://proxy.golang.org,direct; \
	fi
	@echo ">>> 执行 go mod tidy"
	go mod tidy

init-db:
	@echo ">>> 初始化数据库 schema"
	@if [ ! -f $(SCHEMA_FILE) ]; then \
		echo "未找到数据库 schema 文件: $(SCHEMA_FILE)"; \
		exit 1; \
	fi
	@if ! command -v psql >/dev/null 2>&1; then \
		echo "未检测到 psql，请先安装 PostgreSQL 客户端"; \
		exit 1; \
	fi
	@echo "使用数据库连接: $(ACCOUNT_DB_DSN)"
	@psql "$(ACCOUNT_DB_DSN)" -f $(SCHEMA_FILE)

build:
	@echo ">>> 编译 $(APP_NAME)"
	go build -o $(APP_NAME) $(MAIN_FILE)

start:
	@echo ">>> 运行 $(APP_NAME) on port $(PORT) (后台运行)"
	@nohup env PORT=$(PORT) go run $(MAIN_FILE) > $(APP_NAME).log 2>&1 & echo $$! > $(APP_NAME).pid

stop:
	@echo ">>> 停止 $(APP_NAME)"
	@if [ -f $(APP_NAME).pid ]; then \
		kill `cat $(APP_NAME).pid` >/dev/null 2>&1 || true; \
		rm $(APP_NAME).pid; \
	else \
		echo "未找到运行中的进程"; \
	fi

restart: stop start

clean:
	@echo ">>> 清理构建产物"
	rm -f $(APP_NAME) $(APP_NAME).log $(APP_NAME).pid

help:
	@echo " XControl Account Service Makefile"
	@echo ""
	@echo "make init       初始化开发环境（包含 Go 依赖与数据库 schema）"
	@echo "make build      编译 account service 可执行文件"
	@echo "make start      后台运行 account service (默认端口: $(PORT))"
	@echo "make stop       停止运行 account service"
	@echo "make restart    重启 account service"
	@echo "make test       运行账号服务相关单元测试"
	@echo "make dev        开发模式运行 (自动检测 air，如无则用 go run)"
	@echo "make clean      清理构建产物"

test:
	@echo ">>> 运行单元测试"
	go test ./...

dev:
	@echo ">>> 开发模式运行 $(APP_NAME) (热重载) on port $(PORT)"
	@if command -v air >/dev/null; then \
		PORT=$(PORT) air -c .air.toml; \
	else \
		echo "未检测到 air，直接运行 go run"; \
		PORT=$(PORT) go run $(MAIN_FILE); \
	fi
