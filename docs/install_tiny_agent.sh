#!/usr/bin/env bash
# install_tiny_agent.sh - Install Prometheus node_exporter (+ optional process-exporter)
# Debian/Ubuntu. Run as root.
set -euo pipefail

# ====== Config (env overridable) ======
NODE_EXP_VER="${NODE_EXP_VER:-1.8.2}"
PROC_EXP_VER="${PROC_EXP_VER:-0.7.10}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
VERIFY="${VERIFY:-1}"                 # 1=verify sha256, 0=skip
WITH_PROCESS="${WITH_PROCESS:-0}"     # 1=also install process-exporter
CURL_INSECURE="${CURL_INSECURE:-0}"   # 1=allow -k
BIND_ADDR="${BIND_ADDR:-0.0.0.0}"     # 监听地址（node_exporter）
NODE_PORT="${NODE_PORT:-9100}"
PROC_PORT="${PROC_PORT:-9256}"

# ====== Helpers ======
curl_get() {
  # $1=url $2=outfile
  local u="$1" o="$2"
  local extra=()
  [[ "$CURL_INSECURE" = "1" ]] && extra+=(-k)
  curl -fL --retry 6 --retry-all-errors --connect-timeout 20 --max-time 600 \
       --speed-time 30 --speed-limit 10240 \
       -o "$o" "${extra[@]}" "$u"
}

cleanup_bad_tar() {
  local f="$1"
  # 若 tar 失败，删除坏文件，避免下次继续解压同一个坏包
  [[ -f "$f" ]] && rm -f "$f"
}

arch_norm() {
  case "$(uname -m)" in
    x86_64|amd64) echo amd64 ;;
    aarch64|arm64) echo arm64 ;;
    *) echo "Unsupported arch $(uname -m)" >&2; exit 1 ;;
  esac
}

install_binary() {
  # $1=src $2=dst
  install -m 0755 "$1" "$2"
}

ensure_user() {
  # $1=user
  id -u "$1" >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin "$1"
}

# ====== Paths/URLs ======
ARCH="$(arch_norm)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

NODE_NAME="node_exporter-${NODE_EXP_VER}.linux-${ARCH}"
NODE_TGZ="${NODE_NAME}.tar.gz"
NODE_URLS=(
  "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VER}/${NODE_TGZ}"
)
NODE_SUM_URL="https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VER}/sha256sums.txt"

PROC_NAME="process-exporter-${PROC_EXP_VER}.linux-${ARCH}"
PROC_TGZ="${PROC_NAME}.tar.gz"
PROC_URLS=(
  "https://github.com/ncabatoff/process-exporter/releases/download/v${PROC_EXP_VER}/${PROC_TGZ}"
)

# ====== Download with retries & checksum ======
download_with_fallback() {
  # $1: array name of URLs; $2: out path
  local -n arr="$1"
  local out="$2"
  local ok=0
  for u in "${arr[@]}"; do
    echo "→ Downloading: $u"
    if curl_get "$u" "$out"; then
      ok=1; break
    else
      echo "WARN: failed: $u"
    fi
  done
  [[ $ok -eq 1 ]] || { echo "ERROR: all mirrors failed for $out"; exit 2; }
}

verify_sha256() {
  # $1=tar.gz path; $2=sum_url; $3=expected file name in sums
  local f="$1" url="$2" fname="$3" sums="$TMPDIR/sha256sums.txt"
  echo "→ Fetching checksum list..."
  if ! curl_get "$url" "$sums"; then
    echo "WARN: cannot fetch checksums; skip verification."
    return 0
  fi
  echo "→ Verifying sha256 for $fname"
  local expect
  expect="$(grep " ${fname}$" "$sums" | awk '{print $1}')"
  if [[ -z "${expect:-}" ]]; then
    echo "WARN: no checksum entry for $fname; skip verify."
    return 0
  fi
  local got
  got="$(sha256sum "$f" | awk '{print $1}')"
  if [[ "$got" != "$expect" ]]; then
    echo "ERROR: sha256 mismatch for $fname"; return 1
  fi
}

# ====== Install node_exporter ======
echo "[*] Install node_exporter v${NODE_EXP_VER} (${ARCH})"
NODE_TAR="$TMPDIR/${NODE_TGZ}"
download_with_fallback NODE_URLS "$NODE_TAR"

if [[ "$VERIFY" = "1" ]]; then
  if ! verify_sha256 "$NODE_TAR" "$NODE_SUM_URL" "$NODE_TGZ"; then
    cleanup_bad_tar "$NODE_TAR"
    echo "Retrying download due to checksum mismatch..."
    download_with_fallback NODE_URLS "$NODE_TAR"
    verify_sha256 "$NODE_TAR" "$NODE_SUM_URL" "$NODE_TGZ" || { echo "FATAL: checksum still bad"; exit 3; }
  fi
fi

echo "→ Extracting $NODE_TGZ"
tar xzf "$NODE_TAR" -C "$TMPDIR" || { cleanup_bad_tar "$NODE_TAR"; echo "FATAL: tar extract failed"; exit 4; }
install_binary "$TMPDIR/$NODE_NAME/node_exporter" "$INSTALL_DIR/node_exporter"
ensure_user node_exporter

cat >/etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Prometheus Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
ExecStart=${INSTALL_DIR}/node_exporter \
  --web.listen-address=${BIND_ADDR}:${NODE_PORT} \
  --collector.tcpstat \
  --collector.processes
Restart=always

# Hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=full
ProtectHome=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now node_exporter
sleep 1
systemctl --no-pager -l status node_exporter || true

echo "→ Probe node_exporter"
if ! curl -fsS "http://${BIND_ADDR}:${NODE_PORT}/metrics" >/dev/null 2>&1; then
  echo "NOTE: cannot fetch metrics via ${BIND_ADDR}:${NODE_PORT} (OK if binding to 127.0.0.1 and you ran from remote)."
fi

# ====== Optional: process-exporter ======
if [[ "$WITH_PROCESS" = "1" ]]; then
  echo "[*] Install process-exporter v${PROC_EXP_VER} (${ARCH})"
  PROC_TAR="$TMPDIR/${PROC_TGZ}"
  download_with_fallback PROC_URLS "$PROC_TAR"
  echo "→ Extracting $PROC_TGZ"
  tar xzf "$PROC_TAR" -C "$TMPDIR" || { cleanup_bad_tar "$PROC_TAR"; echo "FATAL: tar extract failed"; exit 5; }
  install_binary "$TMPDIR/$PROC_NAME/process-exporter" "$INSTALL_DIR/process-exporter"
  ensure_user process_exporter

  cat >/etc/process-exporter.yml <<'YML'
process_names:
  - name: "{{.Comm}}"
    cmdline: [".+"]
YML

  cat >/etc/systemd/system/process-exporter.service <<EOF
[Unit]
Description=process-exporter
Wants=network-online.target
After=network-online.target

[Service]
User=process_exporter
Group=process_exporter
ExecStart=${INSTALL_DIR}/process-exporter \
  --config.path /etc/process-exporter.yml \
  --web.listen-address=${BIND_ADDR}:${PROC_PORT}
Restart=always
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=full
ProtectHome=yes

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now process-exporter
  sleep 1
  systemctl --no-pager -l status process-exporter || true
fi

echo "OK: node_exporter on ${BIND_ADDR}:${NODE_PORT}"
[[ "$WITH_PROCESS" = "1" ]] && echo "OK: process-exporter on ${BIND_ADDR}:${PROC_PORT}"
