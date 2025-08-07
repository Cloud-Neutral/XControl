OS := $(shell uname -s)
PG_DSN ?= postgres://user:password@127.0.0.1:5432/postgres

.PHONY: install install-openresty install-redis install-postgresql install-pgvector init-db \
	build build-server build-homepage build-panel \
	start start-server start-homepage start-panel \
	stop stop-server stop-homepage stop-panel restart

# -----------------------------------------------------------------------------
# Dependency installation
# -----------------------------------------------------------------------------

install: install-openresty install-redis install-postgresql install-pgvector

install-openresty:
ifeq ($(OS),Darwin)
	@echo "Detected macOS. Installing GeoIP library into /opt/homebrew/geoip..."
	@curl -LO https://github.com/maxmind/geoip-api-c/releases/download/v1.6.12/GeoIP-1.6.12.tar.gz && \
	tar zxvf GeoIP-1.6.12.tar.gz && \
	cd GeoIP-1.6.12 && \
	./configure --prefix=/opt/homebrew/geoip && \
	make -j$(CORES) && \
	sudo make install && \
	cd .. && rm -rf GeoIP-1.6.12 GeoIP-1.6.12.tar.gz

	@echo "Trying Homebrew build of OpenResty with GeoIP..."
	env CPPFLAGS="-I/opt/homebrew/geoip/include" \
	    LDFLAGS="-L/opt/homebrew/geoip/lib" \
	    brew install --build-from-source openresty/brew/openresty || \
	(echo "Homebrew failed, falling back to manual source build..." && \
	curl -LO https://openresty.org/download/openresty-1.27.1.2.tar.gz && \
	tar zxvf openresty-1.27.1.2.tar.gz && \
	cd openresty-1.27.1.2 && \
	./configure \
	  --prefix=/opt/homebrew/openresty \
	  --with-http_geoip_module \
	  --with-cc-opt="-I/opt/homebrew/geoip/include" \
	  --with-ld-opt="-L/opt/homebrew/geoip/lib" && \
	make -j$(CORES) && \
	sudo make install && \
	cd .. && rm -rf openresty-1.27.1.2 openresty-1.27.1.2.tar.gz)
else
	@echo "Detected Linux. Installing via apt..."
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
# Database initialization
# -----------------------------------------------------------------------------
init-db:
	@psql $(PG_DSN) -f docs/init.sql

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

start: start-server start-homepage start-panel

start-server:
	$(MAKE) -C server start

start-homepage:
	$(MAKE) -C ui/homepage start

start-panel:
	$(MAKE) -C ui/panel start

stop: stop-server stop-homepage stop-panel

stop-server:
	$(MAKE) -C server stop

stop-homepage:
	$(MAKE) -C ui/homepage stop

stop-panel:
	$(MAKE) -C ui/panel stop

restart: stop start

