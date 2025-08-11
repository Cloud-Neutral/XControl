#!/usr/bin/env python3
"""
hf_embedding_bench.py
Benchmark Hugging Face encoder models (e.g., bge-m3) for embedding throughput/latency.

Measures:
- TTFT-equivalent for embeddings (first batch wall time)
- Per-batch latency (tokenize, forward, pool), P50/P90/P95
- Throughput: samples/sec, tokens/sec
- Output embedding dimension
- Device/dtype: auto, cuda, mps, cpu; float16/bfloat16/float32

Usage examples:
  python hf_embedding_bench.py --model BAAI/bge-m3 --device auto --dtype bfloat16 --batch-size 32 --seq-len 128 --num-samples 2048 --warmup 10
  python hf_embedding_bench.py --model BAAI/bge-m3 --device mps --dtype float16 --batch-size 16 --seq-len 256 --num-samples 1024
"""

import argparse
import math
import os
import time
from statistics import median

import numpy as np

import torch
from transformers import AutoTokenizer, AutoModel

def pick_device(device: str) -> torch.device:
    if device == "auto":
        if torch.cuda.is_available():
            return torch.device("cuda")
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")
    return torch.device(device)

def dtype_from_str(dtype: str, device: torch.device):
    if dtype == "auto":
        if device.type == "cuda":
            # bf16 preferred on modern NVIDIA; fallback to fp16 if not available
            return torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        if device.type == "mps":
            # mps supports fp16
            return torch.float16
        return torch.float32
    mapping = {"float16": torch.float16, "fp16": torch.float16,
               "bfloat16": torch.bfloat16, "bf16": torch.bfloat16,
               "float32": torch.float32, "fp32": torch.float32}
    return mapping[dtype]

def gen_texts(n: int, seq_len: int) -> list[str]:
    base = "In context learning with vector embeddings on PostgreSQL using pgvector. "
    # crude way: repeat base to approximate seq_len tokens; tokenizer will handle exact length
    repeats = max(1, math.ceil(seq_len / 8))  # ~8 tokens per short phrase heuristic
    s = (base * repeats).strip()
    return [s for _ in range(n)]

def mean_pool(last_hidden_state: torch.Tensor, attention_mask: torch.Tensor) -> torch.Tensor:
    mask = attention_mask.unsqueeze(-1).type_as(last_hidden_state)
    summed = (last_hidden_state * mask).sum(dim=1)
    counts = mask.sum(dim=1).clamp(min=1e-9)
    return summed / counts

def percentile(arr, p):
    if not arr:
        return 0.0
    k = (len(arr)-1) * (p/100.0)
    f = math.floor(k); c = math.ceil(k)
    if f == c:
        return arr[int(k)]
    d0 = arr[f] * (c - k)
    d1 = arr[c] * (k - f)
    return d0 + d1

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="HF model id, e.g., BAAI/bge-m3")
    parser.add_argument("--device", default="auto", choices=["auto","cuda","mps","cpu"])
    parser.add_argument("--dtype", default="auto", choices=["auto","float16","bfloat16","float32","fp16","bf16","fp32"])
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--seq-len", type=int, default=128, help="approximate prompt length in tokens")
    parser.add_argument("--num-samples", type=int, default=2048, help="total texts to embed")
    parser.add_argument("--warmup", type=int, default=10)
    parser.add_argument("--max-length", type=int, default=512, help="tokenizer truncation length")
    parser.add_argument("--compile", action="store_true", help="torch.compile (CUDA/PyTorch2.x)")
    parser.add_argument("--trust-remote-code", action="store_true")
    parser.add_argument("--no-grad", action="store_true", help="use torch.no_grad() (default on)")
    args = parser.parse_args()

    device = pick_device(args.device)
    dt = dtype_from_str(args.dtype, device)

    print(f"🔧 Model: {args.model}")
    print(f"💻 Device: {device.type}   DType: {str(dt).split('.')[-1]}   batch={args.batch_size}  seq_len≈{args.seq_len}  num_samples={args.num_samples}")
    print(f"⚙️  max_length={args.max_length}  warmup={args.warmup}  compile={args.compile}  no_grad={not not args.no_grad or True}")

    tokenizer = AutoTokenizer.from_pretrained(args.model, use_fast=True, trust_remote_code=args.trust_remote_code)
    model = AutoModel.from_pretrained(args.model, trust_remote_code=args.trust_remote_code)
    model.eval().to(device)

    if args.compile and hasattr(torch, "compile") and device.type == "cuda":
        try:
            model = torch.compile(model)
            print("✅ torch.compile enabled")
        except Exception as e:
            print(f"⚠️ torch.compile failed: {e}")

    # autocast policy
    use_amp = (dt in (torch.float16, torch.bfloat16)) and (device.type in ("cuda","mps"))
    # Move to dtype if supported
    try:
        if dt != torch.float32:
            model.to(dtype=dt)
    except Exception as e:
        print(f"⚠️ dtype cast skipped: {e}")

    # data
    texts = gen_texts(args.num_samples, args.seq_len)

    # helper sync
    def dev_sync():
        if device.type == "cuda":
            torch.cuda.synchronize()
        elif device.type == "mps":
            try:
                torch.mps.synchronize()
            except Exception:
                pass

    # warmup
    for _ in range(args.warmup):
        batch = texts[:args.batch_size]
        enc = tokenizer(batch, padding=True, truncation=True, max_length=args.max_length, return_tensors="pt")
        enc = {k: v.to(device, non_blocking=True) for k, v in enc.items()}
        with torch.no_grad():
            with torch.autocast(device_type=device.type, dtype=dt) if use_amp else torch.cuda.amp.autocast(enabled=False):
                out = model(**enc)
                _ = mean_pool(out.last_hidden_state, enc["attention_mask"])
        dev_sync()

    # benchmark
    n_batches = math.ceil(args.num_samples / args.batch_size)
    lat_tokenize = []
    lat_forward = []
    lat_pool = []
    tokens_count = 0
    first_batch_total = None
    start_all = time.perf_counter()

    idx = 0
    for b in range(n_batches):
        batch = texts[idx: idx+args.batch_size]
        idx += len(batch)

        t0 = time.perf_counter()
        enc = tokenizer(batch, padding=True, truncation=True, max_length=args.max_length, return_tensors="pt")
        t1 = time.perf_counter()
        enc = {k: v.to(device, non_blocking=True) for k, v in enc.items()}

        # count tokens (excluding padding where attention_mask=0)
        tokens_count += int(enc["attention_mask"].sum().item())

        # forward
        if args.no_grad:
            cm = torch.no_grad()
        else:
            # embeddings usually inference; leaving option
            class Dummy:
                def __enter__(self): return None
                def __exit__(self, a,b,c): return False
            cm = Dummy()

        with cm:
            t2 = time.perf_counter()
            with torch.autocast(device_type=device.type, dtype=dt) if use_amp else torch.cuda.amp.autocast(enabled=False):
                out = model(**enc)
            dev_sync()
            t3 = time.perf_counter()
            emb = mean_pool(out.last_hidden_state, enc["attention_mask"])
            dev_sync()
            t4 = time.perf_counter()

        lat_tokenize.append(t1 - t0)
        lat_forward.append(t3 - t2)
        lat_pool.append(t4 - t3)
        if first_batch_total is None:
            first_batch_total = (t4 - t0)

    end_all = time.perf_counter()
    total_time = end_all - start_all
    total_samples = args.num_samples

    # stats
    def summarize(name, xs):
        xs_sorted = sorted(xs)
        return {
            "mean": float(np.mean(xs_sorted)) if xs_sorted else 0.0,
            "p50": float(percentile(xs_sorted,50)),
            "p90": float(percentile(xs_sorted,90)),
            "p95": float(percentile(xs_sorted,95)),
        }

    s_tok = summarize("tokenize", lat_tokenize)
    s_fwd = summarize("forward", lat_forward)
    s_pool = summarize("pool", lat_pool)

    # output dim
    dim = int(emb.shape[-1])

    # throughputs
    samples_per_sec = total_samples / total_time if total_time > 0 else 0.0
    tokens_per_sec = tokens_count / total_time if total_time > 0 else 0.0

    print("\n====== Results ======")
    print(f"Device={device.type} dtype={str(dt).split('.')[-1]}  model={args.model}")
    print(f"Output dim: {dim}")
    print(f"Total: {total_time:.4f}s   First-batch(TTFT-like): {first_batch_total:.4f}s")
    print(f"Throughput: {samples_per_sec:.2f} samples/s   {tokens_per_sec:.2f} tokens/s   tokens={tokens_count}")
    def pf(d): return f"mean={d['mean']*1000:.1f}ms p50={d['p50']*1000:.1f}ms p90={d['p90']*1000:.1f}ms p95={d['p95']*1000:.1f}ms"
    print(f"Tokenize: {pf(s_tok)}")
    print(f"Forward : {pf(s_fwd)}")
    print(f"Pool    : {pf(s_pool)}")

if __name__ == "__main__":
    main()
