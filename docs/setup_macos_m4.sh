#!/usr/bin/env bash
set -euo pipefail

echo "==> 1. Xcode Command Line Tools"
xcode-select -p >/dev/null 2>&1 || xcode-select --install || true

echo "==> 2. Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

echo "==> 3. 基础工具"
brew update
brew install git gh wget curl jq cmake pkg-config tree htop tmux

echo "==> 4. Go / Node / Yarn"
brew install go
# Node 推荐用 corepack 管理（pnpm/yarn）
brew install node
corepack enable || true
corepack prepare yarn@stable --activate || true

echo "==> 5. PostgreSQL + pgvector"
brew install postgresql@16
brew services start postgresql@16
# pgvector 扩展（Homebrew 版已包含或单独提供）
brew install pgvector || true

echo "==> 6. Redis"
brew install redis
brew services start redis

echo "==> 7. Python 与虚拟环境"
brew install python@3.12
python3 -m venv ~/.venvs/xcontrol && source ~/.venvs/xcontrol/bin/activate
pip install -U pip wheel

echo "==> 8. RAG: fastembed + Flask（做本地 /v1/embeddings）"
pip install -U fastembed flask numpy huggingface_hub

echo "==> 9. （可选）PyTorch + MPS（Apple GPU 加速，用于 Transformers 生成）"
# 官方 pip 已支持 MPS，一般直接安装即可（若失败可按官网指引重装）
pip install -U torch torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cpu

echo "==> 10. （可选）Ollama（本地生成模型）"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

echo "==> 完成 ✅ 请重新打开终端或执行："
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"'
