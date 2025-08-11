建一个模型清单：
echo bge-m3:latest > models-emb.txt

跑评估（限定 1024 维，更贴合 pgvector(VECTOR(1024))）：

bash docs/bench_embedding.sh --input_config models-emb.txt --require-dim 1024

# 如需导出 CSV：
CSV_OUTPUT=1 bash docs/bench_embedding.sh --input_config models-emb.txt --require-dim 1024


常用命令（以 1024 维 BAAI/bge-m3 为例）

# MPS（Mac）+ FP16，128 token 文本，批量 32，共 2048 样本
python hf_embedding_bench.py --model BAAI/bge-m3 --device mps --dtype float16 \
  --batch-size 32 --seq-len 128 --num-samples 2048 --warmup 10

# CUDA + BF16（若支持），批量 64
python hf_embedding_bench.py --model BAAI/bge-m3 --device cuda --dtype bfloat16 \
  --batch-size 64 --seq-len 128 --num-samples 4096 --warmup 20 --compile

# CPU 基线
python hf_embedding_bench.py --model BAAI/bge-m3 --device cpu --dtype float32 \
  --batch-size 16 --seq-len 128 --num-samples 512
小提示（让数字更准）
CUDA/MPS 下会自动 synchronize()，计时更准确；forward 使用 autocast（fp16/bf16）提升吞吐。

--seq-len 是近似长度，脚本会用 tokenizer 截断到 --max-length（默认 512）。

tokens/s 是按 attention_mask 实际非 padding 的 token 数统计的。

你要严格对齐 1024 维：看脚本输出的 Output dim: 是否为 1024（bge-m3 会是 1024），和你 PG 表 VECTOR(1024) 一一对应。

