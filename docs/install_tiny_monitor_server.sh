#!/usr/bin/env bash
# Tiny Monitor Server: Prometheus + Grafana 12 (GitOps provisioning) + Nginx single-domain
# Debian/Ubuntu only. Run as root.

set -euo pipefail

# ===== Required =====
: "${GIT_URL:-https://github.com/svc-design/gitops.git}"

# ===== Config (env overrides allowed) =====
PROM_VERSION="${PROM_VERSION:-2.49.0}"

# Domains
GRAFANA_DOMAIN="${GRAFANA_DOMAIN:-grafana.svc.plus}"
METRICS_DOMAIN="${METRICS_DOMAIN:-metrics.svc.plus}"

# TLS certs
CERT_PEM="${CERT_PEM:-/etc/ssl/svc.plus.pem}"
CERT_KEY="${CERT_KEY:-/etc/ssl/svc.plus.rsa.key}"

# GitOps repo path
ROOT_DIR="/srv/grafana/grafana-as-code"

# Grafana datasource URL env (供你仓库里的数据源 YAML 使用：${PROM_URL})
PROM_URL_FOR_GRAFANA="${PROM_URL_FOR_GRAFANA:-https://${METRICS_DOMAIN}/prom/}"

# remote_write/remote_read 后端
METRICS_BACKEND_KIND="${METRICS_BACKEND_KIND:-vm}"           # vm | receiver
METRICS_BACKEND_ADDR="${METRICS_BACKEND_ADDR:-10.10.0.50:8428}"  # VM默认8428；Receiver改你的地址
VM_WRITE_PATH="${VM_WRITE_PATH:-/api/v1/write}"
VM_READ_PATH="${VM_READ_PATH:-/api/v1/read}"
RECEIVER_PATH="${RECEIVER_PATH:-/api/v1/receive}"
ENABLE_REMOTE_WRITE="${ENABLE_REMOTE_WRITE:-1}"
ENABLE_REMOTE_READ="${ENABLE_REMOTE_READ:-1}"                 # receiver 通常不支持 remote_read

# Prometheus
PROM_DIR="/opt/prometheus"
PROM_USER="prometheus"
PROM_GROUP="prometheus"
PROM_DATA="/var/lib/prometheus"
PROM_ETC="/etc/prometheus"
FILE_SD_DIR="${PROM_ETC}/file_sd"
# =========================================

echo "[1/9] Install base packages"
apt-get update -y
apt-get install -y curl tar git jq adduser ca-certificates gnupg apt-transport-https nginx

echo "[2/9] Install Grafana 12 (OSS stable)"

echo "[2/9] Install Grafana 12 (OSS stable)"
if ! dpkg -s grafana >/dev/null 2>&1; then
  echo "→ Setting up Grafana APT repo and keyring..."

  # 1. 确保 keyring 目录存在
  install -d -m 0755 /etc/apt/keyrings

  # 2. 获取 Grafana GPG 公钥并转换格式（避免用旧地址）
  curl -fsSL https://apt.grafana.com/gpg.key | \
    gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null

  # 3. 添加 APT 源（signed-by 指向 keyring）
  echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
    | sudo tee /etc/apt/sources.list.d/grafana.list > /dev/null

  # 4. 更新 & 安装
  apt-get update -y
  apt-get install -y grafana
fi


echo "[3/9] Clone GitOps repo -> ${ROOT_DIR}"
mkdir -p "$(dirname "${ROOT_DIR}")"
if [[ -d "${ROOT_DIR}/.git" ]]; then
  git -C "${ROOT_DIR}" pull --ff-only || true
else
  git clone --depth 1 "${GIT_URL}" "${ROOT_DIR}"
fi

echo "[4/9] Wire Grafana Provisioning to GitOps dashboards"
# 仅声明 dashboards provider 指向仓库 dashboards/；数据源/告警建议在仓库自行维护
mkdir -p /etc/grafana/provisioning/dashboards
cat >/etc/grafana/provisioning/dashboards/dashboards.yaml <<'YAML'
apiVersion: 1
providers:
  - name: 'gitops-dashboards'
    type: file
    disableDeletion: false
    allowUiUpdates: false
    updateIntervalSeconds: 30
    options:
      path: /srv/grafana/grafana-as-code/dashboards
      foldersFromFilesStructure: true
YAML

# 注入 Grafana 基本环境变量（域名与 Prom 数据源 URL）
mkdir -p /etc/systemd/system/grafana-server.service.d
cat >/etc/systemd/system/grafana-server.service.d/env.conf <<EOF
[Service]
Environment=GF_SERVER_DOMAIN=${GRAFANA_DOMAIN}
Environment=GF_SERVER_ROOT_URL=https://${GRAFANA_DOMAIN}/
Environment=PROM_URL=${PROM_URL_FOR_GRAFANA}
EOF

echo "[5/9] Install Prometheus ${PROM_VERSION}"
install -d -m 0755 "${PROM_DIR}" "${PROM_ETC}" "${PROM_DATA}" "${FILE_SD_DIR}"
if ! id -u "${PROM_USER}" >/dev/null 2>&1; then
  adduser --system --no-create-home --group "${PROM_USER}"
fi

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  PTAR="prometheus-${PROM_VERSION}.linux-amd64.tar.gz" ;;
  aarch64|arm64) PTAR="prometheus-${PROM_VERSION}.linux-arm64.tar.gz" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

if [[ ! -x "${PROM_DIR}/prometheus" ]]; then
  curl -fsSL "https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/${PTAR}" | tar xz -C /tmp
  SRC="/tmp/$(basename "${PTAR}" .tar.gz)"
  install -m 0755 "${SRC}/prometheus" "${PROM_DIR}/prometheus"
  install -m 0755 "${SRC}/promtool"   "${PROM_DIR}/promtool"
  ln -sf "${PROM_DIR}/prometheus" /usr/local/bin/prometheus
  ln -sf "${PROM_DIR}/promtool"   /usr/local/bin/promtool
fi

echo "[6/9] Prometheus config (file_sd + remote_write/remote_read)"
# 默认抓取本机 node_exporter，可自行编辑 nodes.json 并触发热加载
cat >"${FILE_SD_DIR}/nodes.json" <<'JSON'
[
  { "targets": ["127.0.0.1:9100"], "labels": { "instance": "localhost" } }
]
JSON

cat >"${PROM_ETC}/prometheus.yml" <<EOF
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  - job_name: 'node'
    file_sd_configs:
      - files: ['${FILE_SD_DIR}/nodes.json']
EOF

if [[ "${ENABLE_REMOTE_WRITE}" == "1" ]]; then
  if [[ "${METRICS_BACKEND_KIND}" == "receiver" ]]; then
    RW_URL="https://${METRICS_DOMAIN}${RECEIVER_PATH}"
  else
    RW_URL="https://${METRICS_DOMAIN}${VM_WRITE_PATH}"
  fi
  cat >>"${PROM_ETC}/prometheus.yml" <<EOF

remote_write:
  - url: ${RW_URL}
    queue_config:
      max_samples_per_send: 10000
      max_shards: 8
      capacity: 100000
EOF
fi

if [[ "${ENABLE_REMOTE_READ}" == "1" && "${METRICS_BACKEND_KIND}" == "vm" ]]; then
  RR_URL="https://${METRICS_DOMAIN}${VM_READ_PATH}"
  cat >>"${PROM_ETC}/prometheus.yml" <<EOF

remote_read:
  - url: ${RR_URL}
    read_recent: true
EOF
fi

chown -R ${PROM_USER}:${PROM_GROUP} "${PROM_DATA}" "${PROM_ETC}"

echo "[7/9] Nginx vhost (single domain for Prom UI + ingest) & Grafana web"
# 清理旧链接
for f in /etc/nginx/sites-enabled/grafana.conf /etc/nginx/sites-enabled/metrics.conf; do
  [[ -L "$f" ]] && rm -f "$f"
done

# metrics.svc.plus：/prom/ -> 127.0.0.1:9090，/api/v1/write|read -> 后端
cat >/etc/nginx/sites-available/metrics.conf <<EOF
upstream metrics_backend { server ${METRICS_BACKEND_ADDR}; keepalive 32; }

server {
  listen 443 ssl http2;
  server_name ${METRICS_DOMAIN};
  ssl_certificate     ${CERT_PEM};
  ssl_certificate_key ${CERT_KEY};

  # Prometheus Web/API via subpath
  location /prom/ {
    proxy_set_header Host              \$http_host;
    proxy_set_header X-Real-IP         \$remote_addr;
    proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout  300;
    proxy_send_timeout  300;
    proxy_pass http://127.0.0.1:9090/;
  }

  # Ingest (VM write/read; Receiver write)
  location = ${VM_WRITE_PATH} {
    client_max_body_size 0; proxy_request_buffering off; proxy_buffering off; proxy_http_version 1.1;
    proxy_set_header Host \$http_host; proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 600; proxy_send_timeout 600;
    proxy_pass http://metrics_backend\$request_uri;
  }
  location = ${VM_READ_PATH} {
    client_max_body_size 0; proxy_request_buffering off; proxy_buffering off; proxy_http_version 1.1;
    proxy_set_header Host \$http_host; proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 600; proxy_send_timeout 600;
    proxy_pass http://metrics_backend\$request_uri;
  }
  location = ${RECEIVER_PATH} {
    client_max_body_size 0; proxy_request_buffering off; proxy_buffering off; proxy_http_version 1.1;
    proxy_set_header Host \$http_host; proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 600; proxy_send_timeout 600;
    proxy_pass http://metrics_backend\$request_uri;
  }
}
server { listen 80; server_name ${METRICS_DOMAIN}; return 301 https://\$host\$request_uri; }
EOF

# grafana.svc.plus
cat >/etc/nginx/sites-available/grafana.conf <<EOF
server {
  listen 443 ssl http2;
  server_name ${GRAFANA_DOMAIN};
  ssl_certificate     ${CERT_PEM};
  ssl_certificate_key ${CERT_KEY};

  location / {
    proxy_set_header Host              \$http_host;
    proxy_set_header X-Real-IP         \$remote_addr;
    proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout  300;
    proxy_send_timeout  300;
    proxy_pass http://127.0.0.1:3000;
  }
  location /api/live/ {
    proxy_http_version 1.1;
    proxy_set_header Upgrade    \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass http://127.0.0.1:3000;
  }
}
server { listen 80; server_name ${GRAFANA_DOMAIN}; return 301 https://\$host\$request_uri; }
EOF

ln -s /etc/nginx/sites-available/metrics.conf  /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/grafana.conf  /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "[8/9] Systemd: Prometheus unit (with external-url subpath)"
cat >/etc/systemd/system/prometheus.service <<EOF
[Unit]
Description=Prometheus Server
After=network-online.target
Wants=network-online.target

[Service]
User=${PROM_USER}
Group=${PROM_GROUP}
ExecStart=${PROM_DIR}/prometheus \\
  --config.file=${PROM_ETC}/prometheus.yml \\
  --storage.tsdb.path=${PROM_DATA} \\
  --web.enable-lifecycle \\
  --web.external-url=https://${METRICS_DOMAIN}/prom/ \\
  --web.route-prefix=/
Restart=always
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

echo "[9/9] Enable services + 5m Git pull timer"
# Git pull timer

cat >/etc/systemd/system/grafana-dash-pull.timer <<EOF
[Unit]
Description=git pull dashboards every 5m

[Timer]
OnBootSec=30s
OnUnitActiveSec=5m
AccuracySec=30s

[Install]
WantedBy=timers.target
EOF

cat >/etc/systemd/system/grafana-dash-pull.service <<EOF
[Unit]
Description=git pull dashboards

[Service]
Type=oneshot
WorkingDirectory=/srv/grafana/grafana-as-code
ExecStart=/usr/bin/git pull --ff-only
EOF

systemctl daemon-reload
systemctl enable --now prometheus
systemctl enable --now grafana-server
systemctl enable --now grafana-dash-pull.timer

echo
echo "=== DONE ==="
echo "Grafana  : https://${GRAFANA_DOMAIN}/   (首次登录：admin/admin)"
echo "Metrics  : https://${METRICS_DOMAIN}/prom/  (Prometheus UI/API 子路径)"
echo "Ingest   : https://${METRICS_DOMAIN}/api/v1/write  (VM) | /api/v1/receive (Receiver)"
echo
echo "GitOps repo : ${ROOT_DIR} (每5分钟自动 git pull)"
echo "Prom targets: ${FILE_SD_DIR}/nodes.json  (编辑后热加载：curl -X POST http://127.0.0.1:9090/-/reload)"
echo
echo "Grafana will see PROM_URL=${PROM_URL_FOR_GRAFANA}  (供你仓库的数据源 YAML 使用)"
