APP_NAME := xcontrol-account
MAIN_FILE := ./cmd/accountsvc/main.go
PORT ?= 8080
OS := $(shell uname -s)
SCHEMA_FILE := ./sql/schema.sql

DB_NAME    := account
DB_USER    := shenlan
DB_PASS    := password
DB_HOST    := 127.0.0.1
DB_PORT    := 5432
DB_URL     := postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

ENSURE_UUID_SCHEMA_UP := ./sql/20251004-ensure-uuid-schema.up.sql
ENSURE_UUID_SCHEMA_DOWN := ./sql/20251004-ensure-uuid-schema.down.sql
UUID_MIGRATION_FILE := ./sql/20251001-migrate_to_uuid.sql
UUID_SWITCH_FILE := ./sql/20251001-switch_uuid.sql
MFA_MIGRATION_FILE := ./sql/20251002-add-mfa-columns.sql
export PATH := /usr/local/go/bin:$(PATH)

.PHONY: all init init-go init-db migrate-db migrate-down dump-schema migrate-uuid migrate-mfa build start stop restart clean help dev test

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
	@echo "使用数据库连接: $(DB_URL)"
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 -f $(SCHEMA_FILE)

# 删除数据库（安全防呆）
drop-db:
	@echo "⚠️  即将删除数据库 $(DB_NAME) ..."
	@read -p "确定要删除数据库 $(DB_NAME)? [y/N] " confirm && \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo ">>> 正在删除数据库 $(DB_NAME) ..."; \
		psql -h $(DB_HOST) -U $(DB_USER) -p $(DB_PORT) -d postgres -c "DROP DATABASE IF EXISTS $(DB_NAME);" && \
		echo ">>> 数据库已删除"; \
	else \
		echo "取消删除"; \
	fi

# 重新创建数据库（drop + init）
reinit-db:
	@make drop-db
	@echo ">>> 创建新数据库 $(DB_NAME)"
	psql -h $(DB_HOST) -U $(DB_USER) -p $(DB_PORT) -d postgres -c "CREATE DATABASE $(DB_NAME) OWNER $(DB_USER);"
	@make init-db

migrate-db:
	@echo ">>> 执行统一 UUID schema 迁移"
	@if [ ! -f $(ENSURE_UUID_SCHEMA_UP) ]; then \
	        echo "未找到迁移脚本: $(ENSURE_UUID_SCHEMA_UP)"; \
	        exit 1; \
	fi
	@if ! command -v psql >/dev/null 2>&1; then \
	        echo "未检测到 psql，请先安装 PostgreSQL 客户端"; \
	        exit 1; \
	fi
	@echo "使用数据库连接: $(DB_URL)"
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 -f $(ENSURE_UUID_SCHEMA_UP)
	@$(MAKE) dump-schema

migrate-down:
	@echo ">>> 回滚统一 UUID schema 迁移"
	@if [ ! -f $(ENSURE_UUID_SCHEMA_DOWN) ]; then \
	        echo "未找到回滚脚本: $(ENSURE_UUID_SCHEMA_DOWN)"; \
	        exit 1; \
	fi
	@if ! command -v psql >/dev/null 2>&1; then \
	        echo "未检测到 psql，请先安装 PostgreSQL 客户端"; \
	        exit 1; \
	fi
	@echo "使用数据库连接: $(DB_URL)"
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 -f $(ENSURE_UUID_SCHEMA_DOWN)
	@$(MAKE) dump-schema

dump-schema:
	@echo ">>> 导出数据库 schema 快照"
	@if ! command -v pg_dump >/dev/null 2>&1; then \
	        echo "未检测到 pg_dump，请先安装 PostgreSQL 客户端"; \
	        exit 1; \
	fi
	@pg_dump -s -O -x "$(DB_URL)" > $(SCHEMA_FILE)

migrate-uuid:
	@echo ">>> 执行 UUID 主键迁移"
	@if [ ! -f $(UUID_MIGRATION_FILE) ]; then \
		echo "未找到 UUID 迁移脚本: $(UUID_MIGRATION_FILE)"; \
		exit 1; \
		fi
	@if ! command -v psql >/dev/null 2>&1; then \
	        echo "未检测到 psql，请先安装 PostgreSQL 客户端"; \
	        exit 1; \
    fi
	@echo "使用数据库连接: $(DB_URL)"
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 -f $(UUID_MIGRATION_FILE)
	@if [ -f $(UUID_SWITCH_FILE) ]; then \
	        echo ">>> 应用 UUID 切换脚本: $(UUID_SWITCH_FILE)"; \
	        psql "$(DB_URL)" -v ON_ERROR_STOP=1 -f $(UUID_SWITCH_FILE); \
	fi

migrate-mfa:
	@echo ">>> 执行 MFA 列迁移"
	@if [ ! -f $(MFA_MIGRATION_FILE) ]; then \
	        echo "未找到 MFA 迁移脚本: $(MFA_MIGRATION_FILE)"; \
	        exit 1; \
	fi
	@if ! command -v psql >/dev/null 2>&1; then \
	        echo "未检测到 psql，请先安装 PostgreSQL 客户端"; \
	        exit 1; \
	fi
	@echo "使用数据库连接: $(DB_URL)"
	@psql "$(DB_URL)" -v ON_ERROR_STOP=1 -f $(MFA_MIGRATION_FILE)

build:
	@echo ">>> 编译 $(APP_NAME)"
	go build -o $(APP_NAME) $(MAIN_FILE)

start: build
	@echo ">>> 运行 postgresql on port 5432 (后台运行)"
	brew services start postgresql
	@echo ">>> 运行 $(APP_NAME) on port $(PORT) (后台运行)"
	@./xcontrol-account --config  config/account.yaml

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
	@echo "make migrate-db 执行统一 UUID schema 迁移并导出 schema 快照"
	@echo "make migrate-down 回滚统一 UUID schema 迁移并导出 schema 快照"
	@echo "make dump-schema 仅导出数据库 schema 快照"
	@echo "make migrate-uuid 仅运行 UUID 主键迁移脚本"
	@echo "make migrate-mfa 仅运行 MFA 列迁移脚本"
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
