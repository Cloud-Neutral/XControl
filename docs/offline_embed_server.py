#!/usr/bin/env python3
"""
Offline Embedding Server (Flask + fastembed)

职责：仅加载本地模型目录并提供 /v1/embeddings 服务。
下载请使用 docs/models_downloading.py（已含镜像/代理逻辑）。

环境变量（可选）：
- MODEL_ID    默认 "BAAI/bge-m3"（仅用于返回值展示）
- BGE_M3_DIR  默认 "models/bge-m3"（本地已下载的模型目录）
- HF_HOME     默认 "./hf_cache"（本地缓存；离线可用）
- EMBED_HOST  默认 "0.0.0.0"
- EMBED_PORT  默认 "9000"
"""

import os
import sys
import numpy as np
from pathlib import Path

# ---------------- 配置 ----------------
MODEL_ID = os.getenv("MODEL_ID", "BAAI/bge-m3")
MODEL_DIR = Path(os.getenv("BGE_M3_DIR", "models/bge-m3"))
HF_HOME = Path(os.getenv("HF_HOME", Path.cwd() / "hf_cache"))
HOST = os.getenv("EMBED_HOST", "0.0.0.0")
PORT = int(os.getenv("EMBED_PORT", 9000))

# 关键文件（用于判定目录是否可用）
KEY_FILES = ("tokenizer.json", "config.json", "sentencepiece.bpe.model")

# -------------- 依赖处理 --------------
def _pip_install(pkgs: str):
    os.system(f"{sys.executable} -m pip install -U {pkgs}")

try:
    from flask import Flask, request, jsonify
except ImportError:
    _pip_install("flask")
    from flask import Flask, request, jsonify

try:
    from fastembed import TextEmbedding
except ImportError:
    _pip_install("fastembed")
    from fastembed import TextEmbedding

try:
    import numpy as _np  # 仅用于确认已装
except ImportError:
    _pip_install("numpy")
    import numpy as _np  # noqa

# -------------- 校验本地模型 --------------
def has_local_model(p: Path) -> bool:
    if not p.exists():
        return False
    # 任一关键文件存在即认为可用；或目录非空兜底
    for k in KEY_FILES:
        if any(p.rglob(k)):
            return True
    return any(p.iterdir())

if not has_local_model(MODEL_DIR):
    print(f"❌ Model not found or incomplete in: {MODEL_DIR}")
    print("   请先执行下载：python docs/models_downloading.py")
    sys.exit(1)

# -------------- 设置离线运行 --------------
os.environ["HF_HOME"] = str(HF_HOME)          # 统一缓存目录（Mac/Linux 一致）
os.environ["HF_HUB_OFFLINE"] = "1"             # 强制完全离线
HF_HOME.mkdir(parents=True, exist_ok=True)

# -------------- 启动服务 --------------
app = Flask(__name__)
model = TextEmbedding(str(MODEL_DIR))  # fastembed 直接从本地目录加载

@app.post("/v1/embeddings")
def embeddings():
    data = request.get_json(force=True) or {}
    inp = data.get("input", [])
    if isinstance(inp, str):
        texts = [inp]
    elif isinstance(inp, list):
        # 过滤保证都是字符串
        texts = [str(x) for x in inp]
    else:
        return jsonify({"error": "invalid input type"}), 400

    # fastembed 默认产出已归一向量；这里再 L2 保底
    vecs = []
    for v in model.embed(texts):
        v = np.asarray(v, dtype=np.float32)
        v = v / (np.linalg.norm(v) + 1e-12)
        vecs.append(v.tolist())

    return jsonify({
        "object": "list",
        "data": [
            {"object": "embedding", "index": i, "embedding": e}
            for i, e in enumerate(vecs)
        ],
        "model": data.get("model", MODEL_ID),
    })

@app.get("/healthz")
def healthz():
    # 存在即健康
    return "ok", 200

@app.get("/readyz")
def readyz():
    # 模型已加载即就绪
    try:
        _ = model  # 触发引用
        return "ready", 200
    except Exception as e:
        return f"not ready: {e}", 503

if __name__ == "__main__":
    print(f"🚀 Embedding server")
    print(f"   Model Dir : {MODEL_DIR}")
    print(f"   HF_HOME   : {HF_HOME}")
    print(f"   Offline   : {os.environ.get('HF_HUB_OFFLINE')}")
    print(f"   Listen on : http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT)
