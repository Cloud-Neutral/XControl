#!/usr/bin/env bash
# Tiny Observe Agent (node_exporter + textfile proc metrics + optional sysstat/atop)
# Debian/Ubuntu only. Run as root.

set -euo pipefail

# ======= Config (you can edit) =======
BIND_ADDR="${BIND_ADDR:-0.0.0.0:9100}"     # node_exporter 监听地址
INSTALL_DIR="${INSTALL_DIR:-/opt/metrics-agent}"
TEXT_DIR="${TEXT_DIR:-/var/lib/node_exporter}"
NODE_EXPORTER_VERSION="${NODE_EXPORTER_VERSION:-1.8.2}"   # 可手动固定版本
WITH_SYSSTAT="${WITH_SYSSTAT:-1}"          # 1=启用 sysstat(推荐)  0=关闭
WITH_ATOP="${WITH_ATOP:-0}"                # 1=启用 atop(10min)   0=关闭
# =====================================

echo "[*] Install prereqs & create dirs"
apt-get update -y
apt-get install -y curl tar coreutils
mkdir -p "$INSTALL_DIR" "$TEXT_DIR"

echo "[*] Detect arch & download node_exporter v${NODE_EXPORTER_VERSION}"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)  TAR="node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz" ;;
  aarch64|arm64) TAR="node_exporter-${NODE_EXPORTER_VERSION}.linux-arm64.tar.gz" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac
URL="https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/${TAR}"
curl -fsSL "$URL" | tar xz --strip-components=1 -C "$INSTALL_DIR" --wildcards '*/node_exporter'
chmod 0755 "${INSTALL_DIR}/node_exporter"

echo "[*] Write systemd unit for node_exporter"
cat >/etc/systemd/system/node-exporter.service <<EOF
[Unit]
Description=Prometheus Node Exporter (tiny, LAN)
After=network.target

[Service]
User=nobody
Group=nogroup
ExecStart=${INSTALL_DIR}/node_exporter \\
  --web.listen-address=${BIND_ADDR} \\
  --collector.disable-defaults \\
  --collector.cpu \\
  --collector.meminfo \\
  --collector.loadavg \\
  --collector.filesystem \\
  --collector.diskstats \\
  --collector.netdev \\
  --collector.textfile \\
  --collector.textfile.directory=${TEXT_DIR}
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

echo "[*] Write ultra-light process group metrics script"
cat >/usr/local/bin/proc_metrics.sh <<'EOSH'
#!/usr/bin/env bash
# Generate Prometheus textfile metrics for process groups (ultra-light)
# Groups: nginx, redis, postgres, xcontrol
set -euo pipefail

OUT="/var/lib/node_exporter/proc.prom"
TMP="$(mktemp)"
PAGESIZE="$(getconf PAGESIZE 2>/dev/null || echo 4096)"

declare -A MATCH
MATCH[nginx]='(^/usr/local/openresty/nginx/sbin/nginx$)|(^nginx$)|nginx'
MATCH[redis]='(^/usr/bin/redis-server$)|(^/usr/local/bin/redis-server$)|(^redis-server$)|redis-server'
MATCH[postgres]='(^/.*?/postgres$)|(^/.*?/postmaster$)|(^postgres$)|(^postmaster$)|postgres|postmaster'
MATCH[xcontrol]='(^/usr/bin/xcontrol-server$)|(^xcontrol-server$)|xcontrol-server'

{
  echo "# HELP proc_group_memory_rss_bytes RSS memory by group"
  echo "# TYPE proc_group_memory_rss_bytes gauge"
  echo "# HELP proc_group_open_fds Open file descriptors by group"
  echo "# TYPE proc_group_open_fds gauge"
  echo "# HELP proc_group_cpu_jiffies_total Cumulative CPU jiffies (utime+stime) by group"
  echo "# TYPE proc_group_cpu_jiffies_total counter"
  echo "# HELP proc_group_io_read_bytes_total /proc/<pid>/io read_bytes summed by group"
  echo "# TYPE proc_group_io_read_bytes_total counter"
  echo "# HELP proc_group_io_write_bytes_total /proc/<pid>/io write_bytes summed by group"
  echo "# TYPE proc_group_io_write_bytes_total counter"
  echo "# HELP proc_group_threads Threads by group"
  echo "# TYPE proc_group_threads gauge"
} >"$TMP"

for g in nginx redis postgres xcontrol; do
  rss=0; fds=0; cpu=0; rbytes=0; wbytes=0; threads=0
  pat="${MATCH[$g]}"

  for p in /proc/[0-9]*; do
    pid="${p#/proc/}"
    # Fast skip if cannot read
    [[ -r "$p/stat" ]] || continue

    comm="$(tr -d '\0' <"$p/comm" 2>/dev/null || true)"
    exe="$(readlink -f "$p/exe" 2>/dev/null || true)"
    cmd="$(tr '\0' ' ' <"$p/cmdline" 2>/dev/null || true)"

    if [[ "$comm" =~ $pat || "$exe" =~ $pat || "$cmd" =~ $pat ]]; then
      # RSS from /proc/<pid>/statm (field 2 = resident pages)
      if read -r size resident _ <"$p/statm" 2>/dev/null; then
        rss=$(( rss + resident * PAGESIZE ))
      fi

      # FDs
      if [[ -d "$p/fd" ]]; then
        n=$(ls -U1 "$p/fd" 2>/dev/null | wc -l | tr -d ' ' || echo 0)
        fds=$(( fds + n ))
      fi

      # CPU jiffies from /proc/<pid>/stat (fields 14,15)
      read -r statline <"$p/stat" || true
      # shellcheck disable=SC2206
      arr=($statline)
      ut=${arr[13]:-0}; st=${arr[14]:-0}
      cpu=$(( cpu + ut + st ))

      # IO
      if [[ -r "$p/io" ]]; then
        rb=$(awk '/read_bytes/ {print $2}' "$p/io" 2>/dev/null || echo 0)
        wb=$(awk '/write_bytes/ {print $2}' "$p/io" 2>/dev/null || echo 0)
        rbytes=$(( rbytes + rb ))
        wbytes=$(( wbytes + wb ))
      fi

      # Threads
      ths=$(awk -F: '/Threads/ {gsub(/ /,"",$2); print $2}' "$p/status" 2>/dev/null || echo 0)
      [[ -n "$ths" ]] || ths=0
      threads=$(( threads + ths ))
    fi
  done

  echo "proc_group_memory_rss_bytes{group=\"$g\"} $rss" >>"$TMP"
  echo "proc_group_open_fds{group=\"$g\"} $fds" >>"$TMP"
  echo "proc_group_cpu_jiffies_total{group=\"$g\"} $cpu" >>"$TMP"
  echo "proc_group_io_read_bytes_total{group=\"$g\"} $rbytes" >>"$TMP"
  echo "proc_group_io_write_bytes_total{group=\"$g\"} $wbytes" >>"$TMP"
  echo "proc_group_threads{group=\"$g\"} $threads" >>"$TMP"
done

mv "$TMP" "$OUT"
EOSH
chmod 0755 /usr/local/bin/proc_metrics.sh

echo "[*] Write systemd oneshot + timer for proc metrics (every 5s)"
cat >/etc/systemd/system/proc-metrics.service <<EOF
[Unit]
Description=Generate process group metrics (textfile)
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/proc_metrics.sh
EOF

cat >/etc/systemd/system/proc-metrics.timer <<EOF
[Unit]
Description=Run process group metrics every 5s

[Timer]
OnBootSec=5
OnUnitActiveSec=5s
AccuracySec=1s
Unit=proc-metrics.service

[Install]
WantedBy=timers.target
EOF

if [[ "$WITH_SYSSTAT" == "1" ]]; then
  echo "[*] Enable sysstat (1min sampling, 7 days retention)"
  apt-get install -y sysstat
  sed -ri 's/^ENABLED=.*/ENABLED="true"/' /etc/default/sysstat || true
  echo '* * * * * root sa1 60 1' >/etc/cron.d/sysstat
  systemctl enable --now sysstat || true
fi

if [[ "$WITH_ATOP" == "1" ]]; then
  echo "[*] Enable atop (10min sampling, 7 generations)"
  apt-get install -y atop
  sed -ri 's/^LOGINTERVAL=.*/LOGINTERVAL=600/' /etc/default/atop || true
  sed -ri 's/^LOGGENERATIONS=.*/LOGGENERATIONS=7/' /etc/default/atop || true
  systemctl enable --now atop || true
fi

echo "[*] Reload & start services"
systemctl daemon-reload
systemctl enable --now node-exporter.service
systemctl enable --now proc-metrics.timer

echo "[OK] Tiny agent is up."
echo "    - node_exporter : ${BIND_ADDR}/metrics"
echo "    - textfile dir  : ${TEXT_DIR} (proc.prom will appear within 5s)"
echo
echo "Quick check:"
echo "  curl -s http://${BIND_ADDR}/metrics | head"
echo "  curl -s http://${BIND_ADDR}/metrics | grep -E 'proc_group_(memory|cpu|io|threads)' || true"
