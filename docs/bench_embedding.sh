#!/usr/bin/env bash
# docs/bench_embedding.sh
# Benchmark /v1/embeddings: 维度/耗时/tokens/s/样本吞吐等（支持维度过滤）
set -euo pipefail

# ===== Default Config (env overrides) =====
ENDPOINT="${ENDPOINT:-http://127.0.0.1:9000}"
PATH_EMB="/v1/embeddings"
TIMEOUT="${TIMEOUT:-120}"
N="${N:-20}"             # hey 请求总数
C="${C:-2}"              # hey 并发数
BATCH="${BATCH:-4}"      # 每次请求的 input 条数
CSV_OUTPUT="${CSV_OUTPUT:-}"   # 非空时输出 CSV：embedding_bench.csv
REQUIRE_DIM=""                 # 通过 --require-dim 指定，例如 1024

# 默认模型列表（可用 --input_config 覆盖）
MODELS=(
  "bge-m3:latest"
  "qwen2.5:7b"
  "llama2:7b"
)

# 默认文本样本（可用 --input_texts 覆盖；每行一个样本）
DEFAULT_TEXTS=(
  "用一句话介绍你自己。"
  "What is vector similarity search?"
  "给我三条提升 Postgres 查询性能的建议。"
  "Explain the difference between CPU and GPU."
  "如何在 macOS 上安装 hey 并做并发压测？"
  "Summarize the benefits of using embeddings for RAG."
)

# ===== Parse args =====
INPUT_FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --input_config)
      [[ -f "${2:-}" ]] || { echo "❌ --input_config file not found: ${2:-<missing>}"; exit 1; }
      mapfile -t MODELS < <(sed -e 's/#.*$//' -e '/^[[:space:]]*$/d' "$2")
      shift 2
      ;;
    --input_texts)
      [[ -f "${2:-}" ]] || { echo "❌ --input_texts file not found: ${2:-<missing>}"; exit 1; }
      INPUT_FILE="$2"
      shift 2
      ;;
    --model)
      MODELS=("${2:-bge-m3:latest}")
      shift 2
      ;;
    --require-dim)
      REQUIRE_DIM="${2:-}"
      [[ -n "$REQUIRE_DIM" ]] || { echo "❌ --require-dim needs a number (e.g., 1024)"; exit 1; }
      shift 2
      ;;
    *)
      echo "⚠️  Unknown arg: $1 (ignored)"; shift 1;;
  esac
done

# ===== Deps =====
need(){ command -v "$1" >/dev/null 2>&1 || { echo "❌ Need $1: brew install $1"; exit 1; }; }
need curl; need jq; need awk; need sed; need hey

# ===== Build inputs array (JSON) =====
# 取前 BATCH 条文本，构造 JSON 数组
build_inputs_json() {
  local count="$1"
  local arr="[]"
  if [[ -n "$INPUT_FILE" ]]; then
    arr=$(head -n "$count" "$INPUT_FILE" | sed '/^[[:space:]]*$/d' | jq -R -s 'split("\n")|map(select(length>0))')
  else
    local tmp=""
    for s in "${DEFAULT_TEXTS[@]}"; do tmp+="${s}\n"; done
    arr=$(printf "%b" "$tmp" | head -n "$count" | sed '/^[[:space:]]*$/d' | jq -R -s 'split("\n")|map(select(length>0))')
  fi
  printf '%s' "$arr"
}

# 构造请求负载
json_payload() {
  local model="$1" inputs_json="$2"
  cat <<EOF
{
  "model": "${model}",
  "input": ${inputs_json}
}
EOF
}

# 单次请求：解析 HTTP/TTFT/Total/维度/样本数/usage.prompt_tokens
measure_once() {
  local model="$1" inputs_json="$2"
  local delim="__CURL_TIMING__"
  local resp timing http_code ttft total body dim samples ptok
  resp=$(curl -sS -m "${TIMEOUT}" \
        -H "Content-Type: application/json" \
        -d "$(json_payload "$model" "$inputs_json")" \
        -w "\n${delim} %{http_code} %{time_starttransfer} %{time_total}" \
        "${ENDPOINT}${PATH_EMB}" || true)

  timing=$(printf '%s\n' "$resp" | sed -n '$p')
  read -r _ http_code ttft total <<<"$timing"
  body=$(printf '%s\n' "$resp" | sed '$d')

  dim=$(printf '%s' "$body" | jq -r '.data[0].embedding | length // 0' 2>/dev/null || echo 0)
  samples=$(printf '%s' "$body" | jq -r '.data | length // 0' 2>/dev/null || echo 0)
  ptok=$(printf '%s' "$body" | jq -r '.usage.prompt_tokens // 0' 2>/dev/null || echo 0)

  echo "${http_code:-0} ${ttft:-0} ${total:-0} ${dim:-0} ${samples:-0} ${ptok:-0}"
}

# hey 压测：QPS/Avg/P90/P95
run_hey() {
  local model="$1" inputs_json="$2"
  local tmp payload
  tmp="$(mktemp)"
  payload=$(json_payload "$model" "$inputs_json")
  hey -n "${N}" -c "${C}" -m POST \
    -H "Content-Type: application/json" \
    -D <(printf '%s' "$payload") \
    "${ENDPOINT}${PATH_EMB}" > "$tmp" 2>/dev/null || true

  local reqs avg p90 p95
  reqs=$(grep -E 'Requests/sec' "$tmp" | awk '{print $2}')
  avg=$(grep -E '^  Average:' "$tmp" | awk '{print $2}')
  p90=$(grep -E '  90% in ' "$tmp" | awk '{print $3}')
  # 某些 hey 版本 "  95% in <val>" 第 3 列，也有第 2 列的实现，兼容处理
  p95=$(grep -E '  95% in ' "$tmp" | awk '{print $3}')
  [[ -z "$p95" ]] && p95=$(grep -E '  95% in ' "$tmp" | awk '{print $2}')
  rm -f "$tmp"
  echo "${reqs:-NA} ${avg:-NA} ${p90:-NA} ${p95:-NA}"
}

line(){ printf '%s\n' "-----------------------------------------------------------------------------------------------------"; }

print_header(){
  echo "🔧 Endpoint: ${ENDPOINT}${PATH_EMB}"
  echo "🧪 每请求样本(条)：BATCH=${BATCH}    压测：N=${N}, C=${C}    timeout=${TIMEOUT}s"
  [[ -n "$REQUIRE_DIM" ]] && echo "📏 维度过滤：仅统计 dim == ${REQUIRE_DIM} 的结果"
  line
  printf "%-22s | %-5s | %-8s | %-8s | %-6s | %-7s | %-8s | %-10s | %-10s | %-8s | %-8s\n" \
    "Model" "HTTP" "TTFT" "Total" "Dim" "Samples" "InTok" "Tok/s" "Samples/s" "P90(s)" "P95(s)"
  line
}

maybe_csv_header(){
  [[ -z "$CSV_OUTPUT" ]] && return 0
  echo "model,http,ttft,total,dim,samples,ptokens,tokens_per_s,samples_per_s,p90,p95" > embedding_bench.csv
}

# ===== Run =====
print_header
maybe_csv_header

INPUTS_JSON="$(build_inputs_json "$BATCH")"

for m in "${MODELS[@]}"; do
  # 预热一次
  curl -sS -m "${TIMEOUT}" -o /dev/null -H "Content-Type: application/json" \
    -d "$(json_payload "$m" "$INPUTS_JSON")" "${ENDPOINT}${PATH_EMB}" >/dev/null 2>&1 || true

  # 单次测量
  read -r http_code ttft total dim samples ptok <<<"$(measure_once "$m" "$INPUTS_JSON")"

  if [[ "$http_code" != "200" ]]; then
    printf "%-22s | %-5s | %-8s | %-8s | %-6s | %-7s | %-8s | %-10s | %-10s | %-8s | %-8s\n" \
      "$m" "$http_code" "FAIL" "FAIL" "-" "-" "-" "-" "-" "-"
    [[ -n "$CSV_OUTPUT" ]] && echo "$m,$http_code,FAIL,FAIL,-,-,-,-,-,-,-" >> embedding_bench.csv
    continue
  fi

  # 维度过滤：只统计指定维度（如 1024）
  if [[ -n "$REQUIRE_DIM" && "$dim" != "$REQUIRE_DIM" ]]; then
    printf "%-22s | %-5s | %-8s | %-8s | %-6s | %-7s | %-8s | %-10s | %-10s | %-8s | %-8s\n" \
      "$m" "$http_code" "SKIP" "SKIP" "$dim" "$samples" "$ptok" "-" "-" "-" "-"
    [[ -n "$CSV_OUTPUT" ]] && echo "$m,$http_code,SKIP,SKIP,$dim,$samples,$ptok,-,-,-,-" >> embedding_bench.csv
    continue
  fi

  # 吞吐估算
  toks_per_s="NA"; samples_per_s="NA"
  if awk "BEGIN{exit !($total>0)}"; then
    if awk "BEGIN{exit !($ptok>=0)}"; then
      toks_per_s=$(awk "BEGIN {printf \"%.2f\", ${ptok}/${total}}")
    fi
    if awk "BEGIN{exit !($samples>0)}"; then
      samples_per_s=$(awk "BEGIN {printf \"%.2f\", ${samples}/${total}}")
    fi
  fi

  # 并发压测（补充 P90/P95）
  read -r reqs avg p90 p95 <<<"$(run_hey "$m" "$INPUTS_JSON")"

  printf "%-22s | %-5s | %-8.3f | %-8.3f | %-6s | %-7s | %-8s | %-10s | %-10s | %-8s | %-8s\n" \
    "$m" "$http_code" "$ttft" "$total" "$dim" "$samples" "$ptok" "$toks_per_s" "$samples_per_s" "$p90" "$p95"

  [[ -n "$CSV_OUTPUT" ]] && echo "$m,$http_code,$ttft,$total,$dim,$samples,$ptok,$toks_per_s,$samples_per_s,$p90,$p95" >> embedding_bench.csv
done

line
echo "说明：Dim = 向量维度；Samples = 每请求输入条数；InTok = usage.prompt_tokens；Tok/s = InTok/Total；Samples/s = Samples/Total"
[[ -n "$CSV_OUTPUT" ]] && echo "• 已输出 CSV：embedding_bench.csv"
