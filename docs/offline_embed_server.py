#!/usr/bin/env python3
import os, sys, numpy as np
from pathlib import Path

# 自动装依赖
try:
    from flask import Flask, request, jsonify
    from fastembed import TextEmbedding
    from huggingface_hub import snapshot_download
except ImportError:
    os.system(f"{sys.executable} -m pip install -U flask fastembed numpy huggingface_hub")
    from flask import Flask, request, jsonify
    from fastembed import TextEmbedding
    from huggingface_hub import snapshot_download

# 模型路径
MODEL_DIR = Path(os.getenv("BGE_M3_DIR", "models/bge-m3"))

# 如果本地无模型，先下载
if not MODEL_DIR.exists():
    print(f"⬇️ Downloading BGE-M3 to {MODEL_DIR} ...")
    snapshot_download("BAAI/bge-m3", local_dir=str(MODEL_DIR), local_dir_use_symlinks=False)

# 离线模式
os.environ["HF_HOME"] = str(Path.cwd() / "hf_cache")
os.environ["HF_HUB_OFFLINE"] = "1"

# 启动服务
app = Flask(__name__)
model = TextEmbedding(str(MODEL_DIR))

@app.post("/v1/embeddings")
def embeddings():
    data = request.get_json(force=True) or {}
    texts = [data["input"]] if isinstance(data.get("input"), str) else data.get("input", [])
    vecs = [np.asarray(v, np.float32) / (np.linalg.norm(v) + 1e-12) for v in model.embed(texts)]
    return jsonify({"object": "list", "data": [
        {"object": "embedding", "index": i, "embedding": v.tolist()} for i, v in enumerate(vecs)
    ], "model": data.get("model", "BAAI/bge-m3")})

@app.get("/healthz")
def healthz(): return "ok", 200

if __name__ == "__main__":
    app.run(host=os.getenv("EMBED_HOST", "0.0.0.0"), port=int(os.getenv("EMBED_PORT", 9000)))
