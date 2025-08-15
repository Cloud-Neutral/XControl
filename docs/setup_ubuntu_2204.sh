#!/usr/bin/env bash
set -euo pipefail

install-postgresql() {
    echo "=== 安装 PostgreSQL 14 ==="
    sudo apt-get update
    sudo apt-get install -y wget curl gnupg lsb-release ca-certificates
    if ! grep -q "apt.postgresql.org" /etc/apt/sources.list.d/pgdg.list 2>/dev/null; then
        curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /tmp/pgdg.asc || \
        curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0xB97B0E2D95A5761FB72B0C18ACCC4CF8" -o /tmp/pgdg.asc
        sudo gpg --dearmor -o /usr/share/keyrings/postgresql.gpg /tmp/pgdg.asc
        echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
            | sudo tee /etc/apt/sources.list.d/pgdg.list
        sudo apt-get update
    fi
    sudo apt-get install -y postgresql-14 postgresql-client-14 postgresql-contrib-14 postgresql-server-dev-14
    sudo systemctl enable --now postgresql
}

install-redis() {
    echo "=== 安装 Redis ==="
    sudo apt-get update
    sudo apt-get install -y redis-server
    sudo systemctl enable --now redis-server
}

install-pgvector() {
    echo "=== 安装 pgvector (源码) ==="
    sudo apt-get install -y git make gcc
    tmp_dir=$(mktemp -d)
    cd "$tmp_dir"
    git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git || \
    git clone https://ghproxy.com/https://github.com/pgvector/pgvector.git
    cd pgvector
    make && sudo make install
    cd /
    rm -rf "$tmp_dir"
}

install-zhparser() {
    echo "=== 安装 scws v1.2.3 + zhparser ==="
    sudo apt-get install -y automake autoconf libtool pkg-config

    # 编译安装 scws v1.2.3
    tmp_dir=$(mktemp -d)
    cd "$tmp_dir"
    git clone https://github.com/hightman/scws.git || \
    git clone https://ghproxy.com/https://github.com/hightman/scws.git
    cd scws

    # 修掉 automake 不兼容的注释
    sed -i '/^[[:space:]]*#/d' Makefile.am || true

    # 生成 configure
    if [ ! -f configure ]; then
        if [ -x ./autogen.sh ]; then
            ./autogen.sh
        else
            autoreconf -fi
        fi
    fi

    ./configure --prefix=/usr
    make -j"$(nproc)" && sudo make install
    cd /
    rm -rf "$tmp_dir"

    # 编译安装 zhparser
    tmp_dir=$(mktemp -d)
    cd "$tmp_dir"
    git clone https://github.com/amutu/zhparser.git || \
    git clone https://ghproxy.com/https://github.com/amutu/zhparser.git
    cd zhparser
    make SCWS_HOME=/usr PG_CONFIG=/usr/lib/postgresql/14/bin/pg_config
    sudo make install SCWS_HOME=/usr PG_CONFIG=/usr/lib/postgresql/14/bin/pg_config
    cd /
    rm -rf "$tmp_dir"
}

if declare -f "$1" > /dev/null; then
    "$1"
else
    echo "用法: $0 {install-postgresql|install-redis|install-pgvector|install-zhparser}"
    exit 1
fi
