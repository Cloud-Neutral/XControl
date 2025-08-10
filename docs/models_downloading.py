#!/usr/bin/env python3
"""
models_downloading.py
- 优先级：CN 镜像 (hf-mirror.com) -> 代理(PROXY) -> 官方直连
- 统一缓存：HF_HOME=./hf_cache（可被环境变量覆盖）
- 进度可见：启用 huggingface_hub 的 tqdm 进度
- 幂等安全：本地目录已有关键文件则跳过下载

可选环境变量：
- MODEL_ID   默认 "BAAI/bge-m3"
- MODEL_DIR  默认 "models/bge-m3"
- HF_HOME    默认 "./hf_cache"
- PROXY      默认 "socks5h://127.0.0.1:1081"（留空表示不走代理）
- HF_ENDPOINT 手动指定镜像时可设置（脚本也会自动探测 cn mirror）
"""

import os
import sys
from pathlib import Path

# ---------- 配置 ----------
MODEL_ID  = os.getenv("MODEL_ID", "BAAI/bge-m3")
MODEL_DIR = Path(os.getenv("MODEL_DIR", "models/bge-m3"))
HF_HOME   = Path(os.getenv("HF_HOME", Path.cwd() / "hf_cache"))

CN_MIRROR = "https://hf-mirror.com"
PROXY     = os.getenv("PROXY", "socks5h://127.0.0.1:1081")

# ---------- 提前设置缓存目录（在 import 前） ----------
os.environ["HF_HOME"] = str(HF_HOME)

# ---------- 依赖安装 ----------
def _install(pkgs: str):
    os.system(f"{sys.executable} -m pip install -U {pkgs}")

try:
    import requests
except ImportError:
    _install("requests")
    import requests

# 若走 socks 代理需要 PySocks
if PROXY and "socks" in PROXY:
    try:
        import socks  # noqa: F401
    except ImportError:
        _install("'requests[socks]'")

# ---------- 选择网络模式（镜像 → 代理 → 官方） ----------
def set_network_mode():
    # 若外部已设置 HF_ENDPOINT，尊重外部配置
    if os.getenv("HF_ENDPOINT"):
        print(f"🌏 Using custom HF endpoint: {os.getenv('HF_ENDPOINT')}")
        return

    # 1) 尝试 CN 镜像
    try:
        r = requests.get(CN_MIRROR, timeout=2)
        if r.status_code == 200:
            os.environ["HF_ENDPOINT"] = CN_MIRROR
            print(f"🌏 Using Hugging Face CN mirror: {CN_MIRROR}")
            return
    except Exception:
        pass

    # 2) 走代理
    if PROXY:
        os.environ["HTTP_PROXY"]  = PROXY
        os.environ["HTTPS_PROXY"] = PROXY
        print(f"🌐 Using proxy: {PROXY}")
        return

    # 3) 官方直连
    print("⚠️  No mirror or proxy, using official huggingface.co")

set_network_mode()

# 现在再导入 huggingface_hub，确保拿到正确的 endpoint/proxy 设置
try:
    from huggingface_hub import snapshot_download
except ImportError:
    _install("'huggingface_hub[tqdm]'")
    from huggingface_hub import snapshot_download

# ---------- 工具函数 ----------
KEY_FILES = (
    "tokenizer.json",
    "config.json",
    "sentencepiece.bpe.model",
    "onnx/model.onnx",
    "pytorch_model.bin",
    "model.safetensors",
)

def has_local_model(root: Path) -> bool:
    if not root.exists():
        return False
    for k in KEY_FILES:
        if any(root.rglob(k)):
            return True
    # 兜底：只要非空也算有内容（对应部分仓库布局）
    return any(root.iterdir())

# ---------- 主流程 ----------
def main():
    print("⬇️  Downloading model from Hugging Face…")
    print(f"   Model ID : {MODEL_ID}")
    print(f"   Save dir : {MODEL_DIR}")
    print(f"   HF_HOME  : {HF_HOME}")
    if os.getenv("HF_ENDPOINT"):
        print(f"   Endpoint : {os.getenv('HF_ENDPOINT')}")
    elif os.getenv("HTTP_PROXY"):
        print(f"   Proxy    : {os.getenv('HTTP_PROXY')}")
    else:
        print("   Endpoint : official (huggingface.co)")

    MODEL_DIR.parent.mkdir(parents=True, exist_ok=True)
    HF_HOME.mkdir(parents=True, exist_ok=True)

    # 已有可用文件 → 跳过下载
    if has_local_model(MODEL_DIR):
        print(f"📂 Local model exists, skip download: {MODEL_DIR}")
        print("💡 To force re-download, remove the folder and rerun.")
        return

    # 下载（显示进度）
    try:
        snapshot_download(
            repo_id=MODEL_ID,
            local_dir=str(MODEL_DIR),
            local_dir_use_symlinks=False,
            tqdm_class=None,   # 使用默认 tqdm 进度条
        )
    except Exception as e:
        # 失败时检查是否已经有部分或全部文件
        if has_local_model(MODEL_DIR):
            print(f"⚠️  Online fetch failed but local files exist: {MODEL_DIR}")
            print(f"   Error: {e}")
        else:
            print("❌ Download failed and no local files found.")
            print(f"   Error: {e}")
            print("🔁 Try: 1) 切换镜像/代理  2) 检查网络  3) 稍后重试")
            sys.exit(1)

    # 最终确认
    if has_local_model(MODEL_DIR):
        print(f"✅ Model cached to {MODEL_DIR}")
        print("💡 To run offline later, set: export HF_HUB_OFFLINE=1")
    else:
        print("❌ No model files found after download attempt.")
        sys.exit(1)

if __name__ == "__main__":
    main()
