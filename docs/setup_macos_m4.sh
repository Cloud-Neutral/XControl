#!/usr/bin/env bash
set -euo pipefail

# ---------- helpers ----------
brew_install() {
  local pkg="$1"
  if ! brew list --versions "$pkg" >/dev/null 2>&1; then
    brew install "$pkg"
  else
    echo "✓ $pkg already installed"
  fi
}

brew_service_start() {
  local formula="$1"
  local status
  status="$(brew services list | awk -v f="$formula" '$1==f{print $2}')" || true
  if [[ "$status" != "started" ]]; then
    brew services start "$formula"
  else
    echo "✓ $formula service already started"
  fi
}

append_once() {
  local line="$1"
  local file="$2"
  grep -Fqx "$line" "$file" 2>/dev/null || echo "$line" >> "$file"
}

# ---------- 1) Xcode CLT ----------
echo "==> 1. Xcode Command Line Tools"
xcode-select -p >/dev/null 2>&1 || xcode-select --install || true

# ---------- 2) Homebrew ----------
echo "==> 2. Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
# 确保 shellenv 生效（幂等追加）
append_once 'eval "$(/opt/homebrew/bin/brew shellenv)"' "$HOME/.zprofile"
eval "$(/opt/homebrew/bin/brew shellenv)"

# ---------- 3) 基础工具 ----------
echo "==> 3. 基础工具"
brew update
for p in git gh wget curl jq cmake pkg-config tree htop tmux; do
  brew_install "$p"
done

# ---------- 4) Go / Node / Yarn(corepack) ----------
echo "==> 4. Go / Node / Yarn"
brew_install go
brew_install node
if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
  corepack prepare yarn@stable --activate || true
fi

# ---------- 5) PostgreSQL + pgvector ----------
echo "==> 5. PostgreSQL + pgvector"
brew_install postgresql@16
brew_service_start postgresql@16
brew_install pgvector || true

# ---------- 6) Redis ----------
echo "==> 6. Redis"
brew_install redis
brew_service_start redis

# ---------- 7) Python 与虚拟环境 ----------
echo "==> 7. Python 与虚拟环境"
brew_install python@3.11
# 创建 venv（若不存在）
VENV_DIR="$HOME/.venvs/xcontrol"
if [[ ! -d "$VENV_DIR" ]]; then
  mkdir -p "$HOME/.venvs"
  python3 -m venv "$VENV_DIR"
fi
# 激活 venv
# shellcheck disable=SC1090
source "$VENV_DIR/bin/activate"
python -m pip install -U pip wheel

# ---------- 8) RAG 依赖（Flask + sentence-transformers + fastembed 可选） ----------
echo "==> 8. RAG 依赖（/v1/embeddings 服务）"
# sentence-transformers 覆盖 BGE-M3；fastembed 可选（若你还跑其它支持的模型）
python -m pip install -U flask sentence-transformers numpy huggingface_hub
# 如需 fastembed 再加一行（可选）：
# python -m pip install -U fastembed

# ---------- 9) PyTorch + MPS （Apple GPU，加速 Transformers 推理） ----------
echo "==> 9. PyTorch（MPS 支持）"
# 对 Apple Silicon，直接从 PyPI 装即可，包含 MPS 后端；无需 extra-index-url
python -m pip install -U torch torchvision torchaudio

# ---------- 10) Ollama（本地生成模型，可选） ----------
echo "==> 10. Ollama（可选）"
if ! command -v ollama >/dev/null 2>&1; then
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "✓ ollama already installed"
fi

echo "==> 完成 ✅ 如未生效，请执行："
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"'
echo "   并激活虚拟环境："
echo "source $HOME/.venvs/xcontrol/bin/activate"
