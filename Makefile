OS := $(shell uname -s)
PG_DSN ?= postgres://user:password@127.0.0.1:5432/postgres

.PHONY: install install-openresty install-redis install-postgresql install-pgvector install-zhparser init-db \
        build build-server build-homepage build-panel \
        start start-openresty start-server start-homepage start-panel \
        stop stop-server stop-homepage stop-panel stop-openresty restart

# -----------------------------------------------------------------------------
# Dependency installation
# -----------------------------------------------------------------------------

install: install-openresty install-redis install-postgresql install-pgvector install-zhparser

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
	@echo "Using setup_ubuntu_2204.sh to install Redis..."
	bash docs/setup_ubuntu_2204.sh install-redis
endif

install-postgresql:
ifeq ($(OS),Darwin)
	brew install postgresql@14 && brew services start postgresql@14
else
	@echo "Using setup-ubuntu-2204.sh to install PostgreSQL 14..."
	bash docs/setup_ubuntu_2204.sh install-postgresql
endif

install-pgvector:
ifeq ($(OS),Darwin)
	brew install pgvector
else
	@echo "Using setup-ubuntu-2204.sh to install pgvector..."
	bash docs/setup_ubuntu_2204.sh install-pgvector
endif

install-zhparser:
ifeq ($(OS),Darwin)
	brew install scws && \
	tmp_dir=$$(mktemp -d) && cd $$tmp_dir && \
	git clone https://github.com/amutu/zhparser.git && \
	cd zhparser && make SCWS_HOME=/opt/homebrew PG_CONFIG=$$(brew --prefix postgresql@14)/bin/pg_config && \
	sudo make install SCWS_HOME=/opt/homebrew PG_CONFIG=$$(brew --prefix postgresql@14)/bin/pg_config && \
	cd / && rm -rf $$tmp_dir
else
	@echo "Using setup-ubuntu-2204.sh to install zhparser..."
	bash docs/setup_ubuntu_2204.sh install-zhparser
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
	$(MAKE) -C client build

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
