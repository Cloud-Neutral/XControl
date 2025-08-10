#!/usr/bin/env python3
import os, sys, numpy as np
from pathlib import Path

# ==== 自动安装依赖 ====
def install(pkg):
    os.system(f"{sys.executable} -m pip install -U {pkg}")

try:
    from flask import Flask, request, jsonify
    from fastembed import TextEmbedding
    from huggingface_hub import snapshot_download
except ImportError:
    install("flask fastembed numpy huggingface_hub")
    from flask import Flask, request, jsonify
    from fastembed import TextEmbedding
    from huggingface_hub import snapshot_download

# ==== 配置 ====
MODEL_ID  = os.getenv("MODEL_ID", "BAAI/bge-m3")
MODEL_DIR = Path(os.getenv("MODEL_DIR", "models/bge-m3"))
HF_HOME   = Path(os.getenv("HF_HOME", Path.cwd() / "hf_cache"))

# 设置 HF 缓存目录
os.environ["HF_HOME"] = str(HF_HOME)

# ==== 确保模型已存在（不在这里判断支持性） ====
if not MODEL_DIR.exists() or not any(MODEL_DIR.iterdir()):
    print(f"⬇️ Downloading model {MODEL_ID} to {MODEL_DIR} ...")
    snapshot_download(repo_id=MODEL_ID, local_dir=str(MODEL_DIR), local_dir_use_symlinks=False)

# ==== 离线模式 ====
os.environ["HF_HUB_OFFLINE"] = "1"

# ==== 启动 Flask 服务 ====
app = Flask(__name__)

# 这里用模型 ID 初始化，而不是路径
model = TextEmbedding(MODEL_ID)
DIM = 1024  # bge-m3 的维度

@app.post("/v1/embeddings")
def embeddings():
    data = request.get_json(force=True) or {}
    texts = [data["input"]] if isinstance(data.get("input"), str) else data.get("input", [])
    vecs = [np.asarray(v, np.float32) / (np.linalg.norm(v) + 1e-12) for v in model.embed(texts)]
    return jsonify({
        "object": "list",
        "data": [
            {"object": "embedding", "index": i, "embedding": v.tolist()}
            for i, v in enumerate(vecs)
        ],
        "model": data.get("model", MODEL_ID)
    })

@app.get("/healthz")
def healthz():
    return "ok", 200

if __name__ == "__main__":
    host = os.getenv("EMBED_HOST", "0.0.0.0")
    port = int(os.getenv("EMBED_PORT", 9000))
    print(f"🚀 Starting embedding server on http://{host}:{port}")
    print(f"   Model: {MODEL_ID}")
    print(f"   Cache dir: {HF_HOME}")
    app.run(host=host, port=port)
shenlan@MacBook-Pro-3 XControl % clear
shenlan@MacBook-Pro-3 XControl %
shenlan@MacBook-Pro-3 XControl % cat docs/offline_embed_server.py
#!/usr/bin/env python3
import os, sys, numpy as np
from pathlib import Path

# ==== 自动安装依赖 ====
def install(pkg):
    os.system(f"{sys.executable} -m pip install -U {pkg}")

try:
    from flask import Flask, request, jsonify
    from fastembed import TextEmbedding
    from huggingface_hub import snapshot_download
except ImportError:
    install("flask fastembed numpy huggingface_hub")
    from flask import Flask, request, jsonify
    from fastembed import TextEmbedding
    from huggingface_hub import snapshot_download

# ==== 配置 ====
MODEL_ID  = os.getenv("MODEL_ID", "BAAI/bge-m3")
MODEL_DIR = Path(os.getenv("MODEL_DIR", "models/bge-m3"))
HF_HOME   = Path(os.getenv("HF_HOME", Path.cwd() / "hf_cache"))

# 设置 HF 缓存目录
os.environ["HF_HOME"] = str(HF_HOME)

# ==== 确保模型已存在（不在这里判断支持性） ====
if not MODEL_DIR.exists() or not any(MODEL_DIR.iterdir()):
    print(f"⬇️ Downloading model {MODEL_ID} to {MODEL_DIR} ...")
    snapshot_download(repo_id=MODEL_ID, local_dir=str(MODEL_DIR), local_dir_use_symlinks=False)

# ==== 离线模式 ====
os.environ["HF_HUB_OFFLINE"] = "1"

# ==== 启动 Flask 服务 ====
app = Flask(__name__)

# 这里用模型 ID 初始化，而不是路径
model = TextEmbedding(MODEL_ID)
DIM = 1024  # bge-m3 的维度

@app.post("/v1/embeddings")
def embeddings():
    data = request.get_json(force=True) or {}
    texts = [data["input"]] if isinstance(data.get("input"), str) else data.get("input", [])
    vecs = [np.asarray(v, np.float32) / (np.linalg.norm(v) + 1e-12) for v in model.embed(texts)]
    return jsonify({
        "object": "list",
        "data": [
            {"object": "embedding", "index": i, "embedding": v.tolist()}
            for i, v in enumerate(vecs)
        ],
        "model": data.get("model", MODEL_ID)
    })

@app.get("/healthz")
def healthz():
    return "ok", 200

if __name__ == "__main__":
    host = os.getenv("EMBED_HOST", "0.0.0.0")
    port = int(os.getenv("EMBED_PORT", 9000))
    print(f"🚀 Starting embedding server on http://{host}:{port}")
    print(f"   Model: {MODEL_ID}")
    print(f"   Cache dir: {HF_HOME}")
    app.run(host=host, port=port)