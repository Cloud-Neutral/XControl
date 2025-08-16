#!/usr/bin/env bash
# install_tiny_agent.sh — Install Prometheus exporters (node_exporter / process-exporter)
# Debian/Ubuntu. Run as root.
set -euo pipefail

# ========= Defaults (env overridable) =========
NODE_EXP_VER="${NODE_EXP_VER:-1.8.2}"
PROC_EXP_VER="${PROC_EXP_VER:-0.7.10}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
VERIFY="${VERIFY:-1}"                  # 1=verify sha256 for node_exporter
CURL_INSECURE="${CURL_INSECURE:-0}"    # 1=allow curl -k
BIND_ADDR="${BIND_ADDR:-0.0.0.0}"      # listen address for both exporters
NODE_PORT="${NODE_PORT:-9100}"
PROC_PORT="${PROC_PORT:-9256}"

# ========= Arg parsing =========
MODE="both"  # node/process/both
usage() {
  cat <<EOF
Usage: $0 [--node | --process | --both] [--no-verify]

  --node       Install node_exporter only
  --process    Install process-exporter only
  --both       Install both (default)
  --no-verify  Skip sha256 verification for node_exporter

Environment variables:
  NODE_EXP_VER (default: ${NODE_EXP_VER})
  PROC_EXP_VER (default: ${PROC_EXP_VER})
  BIND_ADDR    (default: ${BIND_ADDR})
  NODE_PORT    (default: ${NODE_PORT})
  PROC_PORT    (default: ${PROC_PORT})
  CURL_INSECURE=1 to allow insecure TLS (curl -k)
  INSTALL_DIR  (default: ${INSTALL_DIR})
EOF
}
while [[ $# -gt 0 ]]; do
  case "$1" in
    --node) MODE="node"; shift ;;
    --process) MODE="process"; shift ;;
    --both) MODE="both"; shift ;;
    --no-verify) VERIFY="0"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

# ========= Helpers =========
arch_norm() {
  case "$(uname -m)" in
    x86_64|amd64) echo amd64 ;;
    aarch64|arm64) echo arm64 ;;
    *) echo "Unsupported arch $(uname -m)" >&2; exit 1 ;;
  esac
}
curl_get() {
  local u="$1" o="$2"; local extra=()
  [[ "$CURL_INSECURE" = "1" ]] && extra+=(-k)
  curl -fL --retry 6 --retry-all-errors --connect-timeout 20 --max-time 600 \
       --speed-time 30 --speed-limit 10240 -o "$o" "${extra[@]}" "$u"
}
cleanup_bad() { [[ -f "$1" ]] && rm -f "$1"; }
install_binary() { install -m 0755 "$1" "$2"; }
ensure_user() { id -u "$1" >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin "$1"; }

download_with_fallback() {
  # $1: array var name of URLs; $2: out path
  local -n arr="$1"; local out="$2"; local ok=0
  for u in "${arr[@]}"; do
    echo "→ Download: $u"
    if curl_get "$u" "$out"; then ok=1; break; else echo "WARN: fail $u"; fi
  done
  [[ $ok -eq 1 ]] || { echo "ERROR: all mirrors failed for $out"; exit 2; }
}
verify_sha256() {
  # $1=tar.gz; $2=sum_url; $3=filename
  local f="$1" url="$2" fname="$3" sums
  sums="$(mktemp)"; trap 'rm -f "$sums"' RETURN
  echo "→ Fetch checksum list"; if ! curl_get "$url" "$sums"; then
    echo "WARN: cannot fetch checksums; skip verification"; return 0; fi
  local expect; expect="$(grep -E " ${fname}$" "$sums" | awk '{print $1}')"
  [[ -z "${expect:-}" ]] && { echo "WARN: checksum entry not found; skip"; return 0; }
  local got; got="$(sha256sum "$f" | awk '{print $1}')"
  if [[ "$got" != "$expect" ]]; then echo "ERROR: sha256 mismatch"; return 1; fi
}

# ========= Installers =========
install_node_exporter() {
  local ARCH TAR NAME TARPATH SUMURL TMP
  ARCH="$(arch_norm)"
  NAME="node_exporter-${NODE_EXP_VER}.linux-${ARCH}"
  TAR="${NAME}.tar.gz"
  SUMURL="https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VER}/sha256sums.txt"
  TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' RETURN

  echo "[*] Installing node_exporter v${NODE_EXP_VER} (${ARCH})"
  local URLS=( "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VER}/${TAR}" )
  TARPATH="${TMP}/${TAR}"
  download_with_fallback URLS "$TARPATH"

  if [[ "$VERIFY" = "1" ]]; then
    if ! verify_sha256 "$TARPATH" "$SUMURL" "$TAR"; then
      cleanup_bad "$TARPATH"; echo "Retry downloading due to checksum mismatch..."
      download_with_fallback URLS "$TARPATH"
      verify_sha256 "$TARPATH" "$SUMURL" "$TAR" || { echo "FATAL: checksum still bad"; exit 3; }
    fi
  fi

  echo "→ Extract & install"
  tar xzf "$TARPATH" -C "$TMP" || { cleanup_bad "$TARPATH"; echo "FATAL: tar failed"; exit 4; }
  install_binary "$TMP/$NAME/node_exporter" "$INSTALL_DIR/node_exporter"
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

  echo "→ Probe node_exporter: http://${BIND_ADDR}:${NODE_PORT}/metrics"
  curl -fsS "http://${BIND_ADDR}:${NODE_PORT}/metrics" >/dev/null 2>&1 || \
    echo "NOTE: can't fetch metrics (ok if bound to 127.0.0.1 and you run remotely)."
}

install_process_exporter() {
  local ARCH TAR NAME TMP
  ARCH="$(arch_norm)"
  NAME="process-exporter-${PROC_EXP_VER}.linux-${ARCH}"
  TAR="${NAME}.tar.gz"
  TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' RETURN

  echo "[*] Installing process-exporter v${PROC_EXP_VER} (${ARCH})"
  local URLS=( "https://github.com/ncabatoff/process-exporter/releases/download/v${PROC_EXP_VER}/${TAR}" )
  local TARPATH="${TMP}/${TAR}"
  download_with_fallback URLS "$TARPATH"

  echo "→ Extract & install"
  tar xzf "$TARPATH" -C "$TMP" || { cleanup_bad "$TARPATH"; echo "FATAL: tar failed"; exit 5; }
  install_binary "$TMP/$NAME/process-exporter" "$INSTALL_DIR/process-exporter"
  ensure_user process_exporter

  # Minimal config: group by executable name; you can refine later
  cat >/etc/process-exporter.yml <<'YML'
process_names:
  - name: "{{.Comm}}"
    cmdline: [".+"]
YML
  chown process_exporter:process_exporter /etc/process-exporter.yml
  chmod 0644 /etc/process-exporter.yml

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

  echo "→ Probe process-exporter: http://${BIND_ADDR}:${PROC_PORT}/metrics"
  curl -fsS "http://${BIND_ADDR}:${PROC_PORT}/metrics" >/dev/null 2>&1 || \
    echo "NOTE: can't fetch metrics (ok if bound to 127.0.0.1 and you run remotely)."
}

# ========= Execute =========
case "$MODE" in
  node) install_node_exporter ;;
  process) install_process_exporter ;;
  both) install_node_exporter; install_process_exporter ;;
  *) echo "Invalid MODE: $MODE"; exit 1 ;;
esac

echo "Done."

