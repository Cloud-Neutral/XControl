OS := $(shell uname -s)

.PHONY: install install-openresty install-redis install-postgresql install-pgvector \
        build build-server build-homepage build-panel \
        run run-server run-homepage run-panel

# -----------------------------------------------------------------------------
# Dependency installation
# -----------------------------------------------------------------------------

install: install-openresty install-redis install-postgresql install-pgvector

install-openresty:
ifeq ($(OS),Darwin)
	brew install openresty/brew/openresty
else
	sudo apt-get update && \
	sudo apt-get install -y openresty || echo "Please install OpenResty manually."
endif

install-redis:
ifeq ($(OS),Darwin)
	brew install redis
else
	sudo apt-get update && \
	sudo apt-get install -y redis-server
endif

install-postgresql:
ifeq ($(OS),Darwin)
	brew install postgresql
else
	sudo apt-get update && \
	sudo apt-get install -y postgresql postgresql-contrib
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
# Build targets
# -----------------------------------------------------------------------------

build: build-server build-homepage build-panel

build-server:
	$(MAKE) -C server build

build-homepage:
	$(MAKE) -C ui/homepage build

build-panel:
	$(MAKE) -C ui/panel build

# -----------------------------------------------------------------------------
# Run targets
# -----------------------------------------------------------------------------

run: run-server run-homepage run-panel

run-server:
	$(MAKE) -C server run

run-homepage:
	$(MAKE) -C ui/homepage dev

run-panel:
	$(MAKE) -C ui/panel run

