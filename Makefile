OS := $(shell uname -s)
PG_DSN ?= postgres://user:password@127.0.0.1:5432/postgres

.PHONY: install install-openresty install-redis install-postgresql install-pgvector init-db \
        build build-server build-homepage build-panel \
        start start-openresty start-server start-homepage start-panel \
        stop stop-server stop-homepage stop-panel stop-openresty restart

# -----------------------------------------------------------------------------
# Dependency installation
# -----------------------------------------------------------------------------

install: install-openresty install-redis install-postgresql install-pgvector

install-openresty:
ifeq ($(OS),Darwin)
	@[ -f install-openresty.sh ] && bash install-openresty.sh
else
	@echo "Detected Linux. Installing via apt..."
	sudo apt-get update && \
	sudo apt-get install -y openresty || echo "Please install OpenResty manually."
	@$(MAKE) start-openresty
endif

install-redis:
ifeq ($(OS),Darwin)
	brew install redis && brew services start redis
else
	sudo apt-get update && \
	sudo apt-get install -y redis-server && \
	sudo systemctl enable --now redis-server
endif

install-postgresql:
ifeq ($(OS),Darwin)
	brew install postgresql && brew services start postgresql
else
	sudo apt-get update && \
	sudo apt-get install -y postgresql postgresql-contrib && \
	sudo systemctl enable --now postgresql
endif

install-pgvector:
ifeq ($(OS),Darwin)
	brew install pgvector
else
	sudo apt-get update && \
	( sudo apt-get install -y postgresql-15-pgvector || \
	  sudo apt-get install -y postgresql-14-pgvector || \
	  echo "Please install pgvector manually." )
endif

# -----------------------------------------------------------------------------
# Database initialization
# -----------------------------------------------------------------------------
init-db:
	@psql $(PG_DSN) -f docs/init.sql

# -----------------------------------------------------------------------------
# Build targets
# -----------------------------------------------------------------------------

build: build-cli build-server build-homepage build-panel

build-cli:
	$(MAKE) -C cmd/xcontrol-cli build

build-server:
	$(MAKE) -C server build

build-homepage:
	$(MAKE) -C ui/homepage build

build-panel:
	$(MAKE) -C ui/panel build

# -----------------------------------------------------------------------------
# Run targets
# -----------------------------------------------------------------------------

start: start-openresty start-server start-homepage start-panel

start-server:
	$(MAKE) -C server start

start-homepage:
	$(MAKE) -C ui/homepage start

start-panel:
	$(MAKE) -C ui/panel start

stop: stop-server stop-homepage stop-panel stop-openresty

stop-server:
	$(MAKE) -C server stop

stop-homepage:
	$(MAKE) -C ui/homepage stop

stop-panel:
	$(MAKE) -C ui/panel stop

start-openresty:
ifeq ($(OS),Darwin)
	@brew services start openresty >/dev/null 2>&1 || \
	( echo "Creating LaunchAgent for OpenResty..." && \
	  mkdir -p ~/Library/LaunchAgents && \
	  printf '%s\n' '<?xml version="1.0" encoding="UTF-8?>' \
		'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' \
		'<plist version="1.0"><dict>' \
		'  <key>Label</key><string>homebrew.mxcl.openresty</string>' \
		'  <key>ProgramArguments</key>' \
		'  <array>' \
		'    <string>/opt/homebrew/openresty/nginx/sbin/nginx</string>' \
		'    <string>-g</string>' \
		'    <string>daemon off;</string>' \
		'  </array>' \
		'  <key>RunAtLoad</key><true/>' \
		'</dict></plist>' \
		> ~/Library/LaunchAgents/homebrew.mxcl.openresty.plist && \
	  brew services start ~/Library/LaunchAgents/homebrew.mxcl.openresty.plist )
else
	sudo systemctl enable --now openresty
endif

stop-openresty:
ifeq ($(OS),Darwin)
	-brew services stop openresty >/dev/null 2>&1
else
	-sudo systemctl stop openresty >/dev/null 2>&1
endif

restart: stop start
