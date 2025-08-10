#!/usr/bin/env python3
"""
Offline Embedding Server for BGE-M3 (Flask + SentenceTransformers)
- 仅运行：不做依赖安装/下载；请先用 docs/models_downloading.py 下载模型
- macOS M4 Pro 默认使用 Apple GPU (MPS)
- /v1/embeddings OpenAI 兼容输出，BGE-M3 默认 1024 维，已 L2 归一

Env (可选):
  MODEL_DIR   default: models/bge-m3
  HF_HOME     default: ./hf_cache
  EMBED_HOST  default: 0.0.0.0
  EMBED_PORT  default: 9000
  BATCH_SIZE  default: 32
  DEVICE      default: mps   # 可设为 cpu / cuda
"""

import os
import sys
import threading
from pathlib import Path
import numpy as np
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

# ---------- 配置 ----------
MODEL_DIR = Path(os.getenv("MODEL_DIR", "models/bge-m3"))
HF_HOME   = Path(os.getenv("HF_HOME", Path.cwd() / "hf_cache"))
HOST      = os.getenv("EMBED_HOST", "0.0.0.0")
PORT      = int(os.getenv("EMBED_PORT", 9000))
BATCH     = int(os.getenv("BATCH_SIZE", 32))
DEVICE    = os.getenv("DEVICE", "mps")  # M4 Pro 优先 MPS

# 建议开启 MPS 回退（个别算子不支持时回退 CPU）
os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")

# ---------- 运行前检查 ----------
if not MODEL_DIR.exists() or not any(MODEL_DIR.iterdir()):
    print(f"❌ Model not found or empty: {MODEL_DIR}")
    print("   请先下载模型，例如：python docs/models_downloading.py")
    sys.exit(1)

# 固定 HF 缓存目录 & 完全离线
os.environ["HF_HOME"] = str(HF_HOME)
os.environ["HF_HUB_OFFLINE"] = "1"
HF_HOME.mkdir(parents=True, exist_ok=True)

# ---------- Flask ----------
app = Flask(__name__)

ready = False
model = None
EMBED_DIM = 1024  # BGE-M3 维度

def _batch_iter(items, bs):
    for i in range(0, len(items), bs):
        yield items[i:i+bs]

def _load_model_async():
    global model, ready
    print(f"🔧 Loading SentenceTransformer from: {MODEL_DIR} (device={DEVICE})")
    model = SentenceTransformer(str(MODEL_DIR), device=DEVICE)
    ready = True
    print("✅ Model loaded and ready.")

@app.get("/healthz")
def healthz():
    return "ok", 200

@app.get("/readyz")
def readyz():
    return ("ready", 200) if ready else ("initializing", 503)

@app.post("/v1/embeddings")
def embeddings():
    if not ready:
        return jsonify({"error": "model not ready"}), 503

    data = request.get_json(force=True) or {}
    inp = data.get("input", [])
    if isinstance(inp, str):
        texts = [inp]
    elif isinstance(inp, list):
        texts = [str(x) for x in inp]
    else:
        return jsonify({"error": "invalid input type"}), 400

    embs_all = []
    for chunk in _batch_iter(texts, BATCH):
        # normalize_embeddings=True -> 已 L2 归一
        vs = model.encode(
            chunk,
            batch_size=min(BATCH, len(chunk)),
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )  # shape: [n, 1024]
        embs_all.extend(vs.tolist())

    return jsonify({
        "object": "list",
        "data": [
            {"object": "embedding", "index": i, "embedding": v}
            for i, v in enumerate(embs_all)
        ],
        "model": "BAAI/bge-m3",
    })

if __name__ == "__main__":
    print(f"🚀 Embedding server booting on http://{HOST}:{PORT}")
    print(f"   Model Dir : {MODEL_DIR}")
    print(f"   HF_HOME   : {HF_HOME}")
    print(f"   Offline   : {os.environ.get('HF_HUB_OFFLINE')}")

    # 后台加载模型，端口先开放
    threading.Thread(target=_load_model_async, daemon=True).start()
    app.run(host=HOST, port=PORT)
