#!/usr/bin/env bash
# Init/update a minimal Grafana GitOps skeleton under a subdir of an existing repo.
# Example:
#   REMOTE="http://git.lan/ops/gitops.git" SUBDIR="grafana-as-code" MAKE_STAGE=1 bash init_grafana_gitops_repo.sh

set -euo pipefail

REMOTE="${REMOTE:-}"
SUBDIR="${SUBDIR:-grafana-as-code}"   # 子目录名
MAKE_STAGE="${MAKE_STAGE:-0}"         # 1 = 创建 stage 分支
FORCE="${FORCE:-0}"                   # 1 = 允许覆盖已有非空内容/更新已有 dashboards symlink

if [[ -z "$REMOTE" ]]; then
  echo "ERROR: Please set REMOTE (e.g. http://git.lan/ops/gitops.git)" >&2
  exit 1
fi

WORKDIR="$(mktemp -d -t grafana-gitops-XXXXXX)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

echo "[1/7] Inspect remote: $REMOTE"
HAS_REFS=0
if git ls-remote "$REMOTE" >/dev/null 2>&1; then
  lines=$(git ls-remote "$REMOTE" | wc -l | tr -d ' ')
  [[ "$lines" -gt 0 ]] && HAS_REFS=1
fi

echo "[2/7] Prepare local working copy"
REPO="$WORKDIR/repo"
if [[ "$HAS_REFS" -eq 1 ]]; then
  # 已有分支：clone 默认分支
  git clone "$REMOTE" "$REPO"
  cd "$REPO"
  HEADBR="$(git remote show origin | sed -n 's/.*HEAD branch: //p')"
  [[ -n "$HEADBR" ]] || HEADBR="main"
  git checkout "$HEADBR" || git checkout -B main
else
  # 空仓库或新建：本地 init 后再 push
  mkdir -p "$REPO"
  cd "$REPO"
  git init -b main
  git remote add origin "$REMOTE"
fi

echo "[3/7] Create skeleton under subdir: $SUBDIR"
TARGET="$SUBDIR"
DASH_DIR="$TARGET/dashboards/infra"
DS_DIR="$TARGET/provisioning/datasources"

if [[ -e "$TARGET" && -n "$(ls -A "$TARGET" 2>/dev/null || true)" && "$FORCE" != "1" ]]; then
  echo "ERROR: $TARGET already exists and is not empty. Set FORCE=1 to proceed." >&2
  exit 1
fi

mkdir -p "$DASH_DIR" "$DS_DIR"

# 极简大盘
cat >"$DASH_DIR/linux-node-proc-groups.json" <<'JSON'
{
  "uid": "linux-node-proc-tiny",
  "title": "Linux Node + Proc Groups (Tiny)",
  "schemaVersion": 39,
  "tags": ["linux","tiny","node_exporter","textfile"],
  "time": {"from": "now-6h", "to": "now"},
  "templating": {
    "list": [
      {"name":"instance","type":"query","datasource":{"type":"prometheus","uid":"prometheus"},
       "query":"label_values(up, instance)","includeAll":false,"multi":false},
      {"name":"group","label":"proc group","type":"query","datasource":{"type":"prometheus","uid":"prometheus"},
       "query":"label_values(proc_group_memory_rss_bytes{instance=~\"$instance\"}, group)","includeAll":true,"multi":true}
    ]
  },
  "panels": [
    {"type":"row","title":"System Overview","gridPos":{"h":1,"w":24,"x":0,"y":0}},
    {"type":"timeseries","title":"CPU Usage (%)","datasource":{"type":"prometheus","uid":"prometheus"},
     "fieldConfig":{"defaults":{"unit":"percent","min":0,"max":100}},
     "gridPos":{"h":8,"w":12,"x":0,"y":1},
     "targets":[{"refId":"A","expr":"100 - (avg by (instance)(irate(node_cpu_seconds_total{instance=~\"$instance\",mode=\"idle\"}[5m])) * 100)"}]},
    {"type":"timeseries","title":"Memory Used (GiB)","datasource":{"type":"prometheus","uid":"prometheus"},
     "fieldConfig":{"defaults":{"unit":"gibibytes"}},
     "gridPos":{"h":8,"w":12,"x":12,"y":1},
     "targets":[{"refId":"A","expr":"(node_memory_MemTotal_bytes{instance=~\"$instance\"} - node_memory_MemAvailable_bytes{instance=~\"$instance\"})"}]},
    {"type":"timeseries","title":"Network Throughput (B/s)","datasource":{"type":"prometheus","uid":"prometheus"},
     "fieldConfig":{"defaults":{"unit":"Bps"}},
     "gridPos":{"h":8,"w":24,"x":0,"y":9},
     "targets":[
       {"refId":"A","expr":"sum by (instance)(rate(node_network_receive_bytes_total{instance=~\"$instance\",device!~\"lo|veth.*|docker.*\"}[5m]))","legendFormat":"rx"},
       {"refId":"B","expr":"sum by (instance)(rate(node_network_transmit_bytes_total{instance=~\"$instance\",device!~\"lo|veth.*|docker.*\"}[5m]))","legendFormat":"tx"}]},
    {"type":"row","title":"Process Groups","gridPos":{"h":1,"w":24,"x":0,"y":17}},
    {"type":"table","title":"Top RSS by Group (MiB)","datasource":{"type":"prometheus","uid":"prometheus"},
     "fieldConfig":{"defaults":{"unit":"Mbytes"}},
     "gridPos":{"h":8,"w":12,"x":0,"y":18},
     "targets":[{"refId":"A","expr":"topk(10, sum by (group)(proc_group_memory_rss_bytes{instance=~\"$instance\"})/1024/1024)","legendFormat":"{{group}}"}]},
    {"type":"timeseries","title":"Group CPU (jiffies/s)","datasource":{"type":"prometheus","uid":"prometheus"},
     "gridPos":{"h":8,"w":12,"x":12,"y":18},
     "targets":[{"refId":"A","expr":"sum by (group)(rate(proc_group_cpu_jiffies_total{instance=~\"$instance\",group=~\"$group\"}[1m]))","legendFormat":"{{group}}"}]},
    {"type":"timeseries","title":"Group IO (B/s)","datasource":{"type":"prometheus","uid":"prometheus"},
     "fieldConfig":{"defaults":{"unit":"Bps"}},
     "gridPos":{"h":8,"w":24,"x":0,"y":26},
     "targets":[
       {"refId":"A","expr":"sum by (group)(rate(proc_group_io_read_bytes_total{instance=~\"$instance\",group=~\"$group\"}[1m]))","legendFormat":"{{group}} read"},
       {"refId":"B","expr":"sum by (group)(rate(proc_group_io_write_bytes_total{instance=~\"$instance\",group=~\"$group\"}[1m]))","legendFormat":"{{group}} write"}]}]}
JSON

# 数据源模板（使用 ${PROM_URL}）
cat >"$DS_DIR/prometheus-ds.yaml" <<'YAML'
apiVersion: 1
datasources:
  - uid: prometheus
    name: Prometheus
    type: prometheus
    access: proxy
    url: ${PROM_URL}
    isDefault: true
    jsonData: { httpMethod: GET }
YAML

# 根目录放一个 dashboards -> 子目录 的软链，兼容你的安装脚本读取路径
if [[ -e "dashboards" && ! -L "dashboards" ]]; then
  if [[ "$FORCE" != "1" ]]; then
    echo "WARN: ./dashboards exists and is not a symlink; skip creating link. Use FORCE=1 to replace." >&2
  else
    rm -rf dashboards
    ln -s "$SUBDIR/dashboards" dashboards
  fi
elif [[ -L "dashboards" ]]; then
  CUR="$(readlink dashboards || true)"
  if [[ "$CUR" != "$SUBDIR/dashboards" ]]; then
    if [[ "$FORCE" == "1" ]]; then
      ln -sfn "$SUBDIR/dashboards" dashboards
    else
      echo "WARN: dashboards symlink points to '$CUR'; set FORCE=1 to repoint." >&2
    fi
  fi
else
  ln -s "$SUBDIR/dashboards" dashboards
fi

# README（子目录）
mkdir -p "$SUBDIR"
cat >"$SUBDIR/README.md" <<MD
# Grafana 12 GitOps (in $SUBDIR)

- dashboards/infra/linux-node-proc-groups.json
- provisioning/datasources/prometheus-ds.yaml (uses \${PROM_URL})
- Root symlink: ../dashboards -> $SUBDIR/dashboards (for server provisioning compatibility)
MD

echo "[4/7] Optional JSON validation"
if command -v jq >/dev/null 2>&1; then
  jq . <"$DASH_DIR/linux-node-proc-groups.json" >/dev/null
else
  echo "jq not found; skip validation."
fi

echo "[5/7] Commit"
git add -A
git config user.name  "gitops-init"
git config user.email "gitops-init@git.lan"
if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "init: grafana-as-code skeleton under ${SUBDIR}"
fi

echo "[6/7] Push main"
git rev-parse --abbrev-ref HEAD >/dev/null 2>&1 || git checkout -B main
git push -u origin HEAD:main

if [[ "$MAKE_STAGE" == "1" ]]; then
  echo "[7/7] Create & push 'stage'"
  git checkout -B stage
  git push -u origin stage
else
  echo "[7/7] Done (stage skipped; MAKE_STAGE=1 to create)."
fi

echo
echo "Repo: ${REMOTE}"
echo "Subdir: ${SUBDIR}"
echo "Root symlink 'dashboards' -> '${SUBDIR}/dashboards' created (or left intact)."
echo "You can now run install_tiny_monitor_server.sh with:"
echo "  GIT_URL=\"${REMOTE}\" sudo -E bash install_tiny_monitor_server.sh"
