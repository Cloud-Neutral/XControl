OS := $(shell uname -s)
PG_DSN ?= postgres://user:password@127.0.0.1:5432/postgres

.PHONY: install install-openresty install-redis install-postgresql install-pgvector init-db \
        build build-server build-homepage build-panel \
        run run-server run-homepage run-panel

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
	psql $(PG_DSN) <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    repo TEXT NOT NULL,
    path TEXT NOT NULL,
    chunk_id INT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING gin (metadata);
SQL

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

