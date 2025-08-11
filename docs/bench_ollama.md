# 1) 单场景（默认 max_tokens=200）
bash docs/bench_ollama.sh

# 2) 指定模型清单
bash docs/bench_ollama.sh --input_config models.txt

# 3) 双场景（短答=64、长答=200）
bash docs/bench_ollama.sh --input_config models.txt --gen-only

# 4) 导出 CSV（双场景）
CSV_OUTPUT=1 bash docs/bench_ollama.sh --input_config models.txt --gen-only

# 可调参数（示例）
SHORT_TOKENS=48 LONG_TOKENS=256 N=30 C=4 bash docs/bench_ollama.sh --gen-only
