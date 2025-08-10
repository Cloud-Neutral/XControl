#!/usr/bin/env python3
"""
离线模型下载器（Hugging Face Hub + SOCKS5 自动支持）

默认参数：
- MODEL_ID="BAAI/bge-m3"
- MODEL_DIR="./models/bge-m3"
- PROXY="socks5://127.0.0.1:1080"

可用环境变量覆盖：
- export MODEL_ID="你的模型ID"
- export MODEL_DIR="/保存路径"
- export PROXY="socks5h://ip:port"   # 为空表示直连
"""

import os
import sys
from pathlib import Path

# ==== 自动安装 SOCKS 依赖 ====
try:
    import socks  # PySocks
except ImportError:
    print("📦 Installing SOCKS proxy support (requests[socks])...")
    os.system(f"{sys.executable} -m pip install -U 'requests[socks]'")
    import socks

# ==== 自动安装 huggingface_hub ====
try:
    from huggingface_hub import snapshot_download
except ImportError:
    print("📦 Installing huggingface_hub...")
    os.system(f"{sys.executable} -m pip install -U huggingface_hub")
    from huggingface_hub import snapshot_download

# ==== 默认配置 ====
DEFAULT_MODEL_ID = "BAAI/bge-m3"
DEFAULT_MODEL_DIR = "models/bge-m3"
DEFAULT_PROXY = "socks5://127.0.0.1:1080"

# ==== 从环境变量读取 ====
MODEL_ID = os.environ.get("MODEL_ID", DEFAULT_MODEL_ID)
MODEL_DIR = Path(os.environ.get("MODEL_DIR", DEFAULT_MODEL_DIR))
PROXY = os.environ.get("PROXY", DEFAULT_PROXY)

# ==== 设置代理 ====
if PROXY:
    os.environ["HTTP_PROXY"] = PROXY
    os.environ["HTTPS_PROXY"] = PROXY
    print(f"🌐 Using proxy: {PROXY}")
else:
    print("🚫 No proxy configured, direct connection.")

# ==== 创建保存目录 ====
MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)

# ==== 下载模型 ====
print(f"⬇️  Downloading model from Hugging Face...")
print(f"   Model ID: {MODEL_ID}")
print(f"   Save dir: {MODEL_DIR}")

snapshot_download(
    repo_id=MODEL_ID,
    local_dir=str(MODEL_DIR),
    local_dir_use_symlinks=False
)

print(f"✅ Model cached to {MODEL_DIR}")

