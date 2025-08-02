APP_NAME := xcontrol-server
MAIN_FILE := ../cmd/api/main.go
MODULE := xcontrol
PORT := 3001

.PHONY: all build run clean init help dev
.RECIPEPREFIX := >

all: build

init:
> @echo ">>> 初始化 Go 依赖环境"
> @if curl -s --max-time 5 https://goproxy.cn >/dev/null; then \
> echo "使用国内镜像: goproxy.cn"; \
> go env -w GOPROXY=https://goproxy.cn,direct; \
> else \
> echo "国内镜像不可用，使用默认: proxy.golang.org"; \
> go env -w GOPROXY=https://proxy.golang.org,direct; \
> fi
> go mod tidy

build:
> @echo ">>> 编译 $(APP_NAME)"
> go build -o $(APP_NAME) $(MAIN_FILE)

run:
> @echo ">>> 运行 $(APP_NAME) on port $(PORT)"
> PORT=$(PORT) go run $(MAIN_FILE)

dev:
> @echo ">>> 开发模式运行 $(APP_NAME) (热重载) on port $(PORT)"
> @if ! command -v air >/dev/null; then \
> echo "未检测到 air，请先运行: go install github.com/cosmtrek/air@latest"; \
> exit 1; \
> fi
> PORT=$(PORT) air -c .air.toml

clean:
> @echo ">>> 清理构建产物"
> rm -f $(APP_NAME)

help:
> @echo " XControl Server Makefile"
> @echo ""
> @echo "make build    编译 server 可执行文件"
> @echo "make run      运行 server (默认端口: $(PORT))"
> @echo "make dev      开发模式运行 (热重载, 默认端口: $(PORT))"
> @echo "make init     初始化依赖（自动选择国内/默认 Go 模块代理）"
> @echo "make clean    清理构建产物"

