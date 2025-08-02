APP_NAME := xcontrol-server
MAIN_FILE := ../cmd/api/main.go
MODULE := xcontrol

.PHONY: all build run clean init help

all: build

init:
	go mod tidy

build:
	go build -o $(APP_NAME) $(MAIN_FILE)

run:
	go run $(MAIN_FILE)

clean:
	rm -f $(APP_NAME)

help:
	@echo " XControl Server Makefile"
	@echo ""
	@echo "make build    编译 server 可执行文件"
	@echo "make run      运行 server"
	@echo "make init     初始化依赖"
	@echo "make clean    清理构建产物"
