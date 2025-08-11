#!/usr/bin/env bash
# docs/bench_ollama.sh
# 比较多模型的 TTFT / Total / QPS / P90 / P95 / 输入输出 Tokens / 吞吐
# 支持 --input_config 模型清单；--gen-only 运行双场景（短答=交互延迟 + 长答=生成吞吐）

set -euo pipefail

# ===== Default Config (可通过环境变量覆盖) =====
ENDPOINT="${ENDPOINT:-http://127.0.0.1:11434}"
PATH_CHAT="/v1/chat/completions"
PROMPT="${PROMPT:-你好，简要介绍一下自己}"
N="${N:-20}"               # hey 总请求数
C="${C:-2}"                # hey 并发数
TEMP="${TEMP:-0.7}"
TIMEOUT="${TIMEOUT:-120}"  # 单请求超时秒
CSV_OUTPUT="${CSV_OUTPUT:-}"      # 若设为非空，输出 CSV
SHORT_TOKENS="${SHORT_TOKENS:-64}"   # 交互延迟场景 max_tokens
LONG_TOKENS="${LONG_TOKENS:-200}"    # 生成吞吐场景 max_tokens

# ===== 默认模型列表（可用 --input_config 覆盖）=====
MODELS=(
  "qwen2.5:7b"
  "qwen2.5-coder:14b"
  "mistral-nemo:12b"
  "llama2:7b"
  "llama2:13b"
)

# ===== 解析参数 =====
RUN_DUAL=""  # 空：单场景；非空：双场景
if [[ "${1:-}" == "--input_config" ]]; then
  if [[ -f "${2:-}" ]]; then
    mapfile -t MODELS < <(sed -e 's/#.*$//' -e '/^[[:space:]]*$/d' "$2")
    shift 2
  else
    echo "❌ --input_config file not found: ${2:-<missing>}" && exit 1
  fi
fi
if [[ "${1:-}" == "--gen-only" ]]; then
  RUN_DUAL=1
  shift 1
fi

# ===== 依赖检查 =====
need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ 需要 $1，请安装：brew install $1"; exit 1; }; }
need curl; need hey; need jq; need awk; need sed

# ===== 工具函数 =====
json_payload() {
  local model="$1" max_toks="$2"
  cat <<EOF
{
  "model": "${model}",
  "messages": [{"role":"user","content":"${PROMPT}"}],
  "max_tokens": ${max_toks},
  "temperature": ${TEMP}
}
EOF
}

measure_curl_timing() {
  local model="$1" max_toks="$2"
  local delim="__CURL_TIMING__"
  local resp timing http_code ttft total body prompt_tokens completion_tokens

  resp=$(curl -sS -m "${TIMEOUT}" \
        -H "Content-Type: application/json" \
        -d "$(json_payload "$model" "$max_toks")" \
        -w "\n${delim} %{http_code} %{time_starttransfer} %{time_total}" \
        "${ENDPOINT}${PATH_CHAT}" || true)

  timing=$(printf '%s\n' "$resp" | sed -n '$p')
  read -r _ http_code ttft total <<<"$timing"

  body=$(printf '%s\n' "$resp" | sed '$d')
  prompt_tokens=$(printf '%s' "$body" | jq -r '.usage.prompt_tokens // 0' 2>/dev/null || echo 0)
  completion_tokens=$(printf '%s' "$body" | jq -r '.usage.completion_tokens // 0' 2>/dev/null || echo 0)

  echo "${http_code:-0} ${ttft:-0} ${total:-0} ${prompt_tokens:-0} ${completion_tokens:-0}"
}

run_hey() {
  local model="$1" max_toks="$2" tmp
  tmp="$(mktemp)"
  hey -n "${N}" -c "${C}" -m POST \
    -H "Content-Type: application/json" \
    -D <(json_payload "$model" "$max_toks") \
    "${ENDPOINT}${PATH_CHAT}" > "$tmp" 2>/dev/null || true

  local reqs avg p90 p95
  reqs=$(grep -E 'Requests/sec' "$tmp" | awk '{print $2}')
  avg=$(grep -E '^  Average:' "$tmp" | awk '{print $2}')
  p90=$(grep -E '  90% in ' "$tmp" | awk '{print $3}')
  p95=$(grep -E '  95% in ' "$tmp" | awk '{print $3}')
  rm -f "$tmp"
  echo "${reqs:-NA} ${avg:-NA} ${p90:-NA} ${p95:-NA}"
}

line() { printf '%s\n' "-----------------------------------------------------------------------------------------------------"; }

print_header() {
  local label="$1" mtoks="$2"
  echo "🔧 Endpoint: ${ENDPOINT}${PATH_CHAT}"
  echo "🗣️  Prompt: ${PROMPT}"
  echo "📦 N=${N}, C=${C}, temp=${TEMP}, timeout=${TIMEOUT}s"
  echo "🧪 场景：${label}（max_tokens=${mtoks}）"
  line
  printf "%-22s | %-5s | %-8s | %-8s | %-6s | %-6s | %-10s | %-10s | %-8s | %-8s | %-8s | %-9s\n" \
    "Model" "HTTP" "TTFT" "Total" "InTok" "OutTok" "Req/s" "Avg(s)" "P90(s)" "P95(s)" "OutTok/s" "GenTok/s"
  line
}

maybe_csv_header() {
  local csv="$1"
  [[ -z "$CSV_OUTPUT" ]] && return 0
  echo "model,http,ttft,total,in_tok,out_tok,req_s,avg_s,p90_s,p95_s,outtok_per_s,gen_tok_per_s" > "$csv"
}

run_suite() {
  local label="$1" mtoks="$2" csv="$3"

  print_header "$label" "$mtoks"
  maybe_csv_header "$csv"

  for m in "${MODELS[@]}"; do
    # 预热
    curl -sS -m "${TIMEOUT}" -o /dev/null -H "Content-Type: application/json" \
      -d "$(json_payload "$m" "$mtoks")" "${ENDPOINT}${PATH_CHAT}" >/dev/null 2>&1 || true

    # 单次测时 + tokens
    read -r http_code ttft total in_tok out_tok <<<"$(measure_curl_timing "$m" "$mtoks")"

    if [[ "$http_code" != "200" ]]; then
      printf "%-22s | %-5s | %-8s | %-8s | %-6s | %-6s | %-10s | %-10s | %-8s | %-8s | %-8s | %-9s\n" \
        "$m" "$http_code" "FAIL" "FAIL" "-" "-" "FAIL" "FAIL" "FAIL" "FAIL" "FAIL" "FAIL"
      [[ -n "$CSV_OUTPUT" ]] && echo "$m,$http_code,FAIL,FAIL,-,-,FAIL,FAIL,FAIL,FAIL,FAIL,FAIL" >> "$csv"
      continue
    fi

    # 并发压测
    read -r reqs avg p90 p95 <<<"$(run_hey "$m" "$mtoks")"

    # 吞吐（包含首字延迟）
    outtok_per_s="NA"
    if awk "BEGIN{exit !($total>0 && $out_tok>0)}"; then
      outtok_per_s=$(awk "BEGIN {printf \"%.2f\", ${out_tok}/${total}}")
    fi

    # 纯生成吞吐：OutTok / (Total - TTFT)
    gen_tok_per_s="NA"
    gen_denom=$(awk "BEGIN {d = ${total}-${ttft}; if (d>0) printf \"%.6f\", d; else printf \"0\"}")
    if awk "BEGIN{exit !($gen_denom>0 && $out_tok>0)}"; then
      gen_tok_per_s=$(awk "BEGIN {printf \"%.2f\", ${out_tok}/${gen_denom}}")
    fi

    printf "%-22s | %-5s | %-8.3f | %-8.3f | %-6s | %-6s | %-10s | %-10s | %-8s | %-8s | %-8s | %-9s\n" \
      "$m" "$http_code" "$ttft" "$total" "$in_tok" "$out_tok" "$reqs" "$avg" "$p90" "$p95" "$outtok_per_s" "$gen_tok_per_s"

    [[ -n "$CSV_OUTPUT" ]] && echo "$m,$http_code,$ttft,$total,$in_tok,$out_tok,$reqs,$avg,$p90,$p95,$outtok_per_s,$gen_tok_per_s" >> "$csv"
  done

  line
  echo "说明：InTok = 输入 tokens，OutTok = 输出 tokens；OutTok/s = OutTok/Total；GenTok/s = OutTok/(Total-TTFT)"
  [[ -n "$CSV_OUTPUT" ]] && echo "• 已输出 CSV：$csv"
  echo
}

# ===== 执行 =====
if [[ -n "$RUN_DUAL" ]]; then
  # 场景 1：交互延迟（短答）
  run_suite "交互延迟（短答）" "$SHORT_TOKENS" "bench_ollama_interactive.csv"
  # 场景 2：生成吞吐（长答）
  run_suite "生成吞吐（长答）" "$LONG_TOKENS" "bench_ollama_throughput.csv"
else
  # 单场景：使用 LONG_TOKENS（与旧版保持一致）
  run_suite "单场景（默认）" "$LONG_TOKENS" "bench_ollama.csv"
fi
