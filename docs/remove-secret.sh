#!/bin/bash
set -e

echo "📁 当前目录：$(pwd)"

# ✅ 检查是否为 Git 仓库
if [ ! -d .git ]; then
    echo "❌ 当前目录不是 Git 仓库，请切换到仓库根目录再运行此脚本。"
    exit 1
fi

# ✅ 检查依赖项
for cmd in git-filter-repo gitleaks jq; do
    if ! command -v $cmd &>/dev/null; then
        echo "❌ 缺少依赖：$cmd，请先安装。"
        exit 1
    fi
done

# ✅ 设置变量并注册清理机制
GITLEAKS_OUTPUT="gitleaks-report.json"
EXCLUDE_FILE=$(mktemp)

cleanup() {
    echo "🧽 清理临时文件..."
    rm -f "$GITLEAKS_OUTPUT" "$EXCLUDE_FILE"
}
trap cleanup EXIT

# ✅ 执行 gitleaks 检查
echo "🔍 正在执行 gitleaks 扫描敏感文件..."
gitleaks detect --no-banner --report-format=json --report-path="$GITLEAKS_OUTPUT" --source . --log-opts='--all'

# ✅ 提取泄露文件路径
LEAK_PATHS=$(jq -r '.[].File' "$GITLEAKS_OUTPUT" | sort | uniq)

if [ -z "$LEAK_PATHS" ]; then
    echo "✅ 未发现泄露文件，无需清理历史版本。"
    exit 0
fi

echo "🚨 以下文件将从 Git 历史中彻底删除："
echo "$LEAK_PATHS"

# ✅ 循环删除每个路径
for path in $LEAK_PATHS; do
    echo "🧹 删除历史中的文件：$path"
    git filter-repo --force --path "$path" --invert-paths
done

# ✅ 强制推送历史
echo "🚀 正在强制推送到远程（覆盖历史）..."
git push --force --all
git push --force --tags

echo ""
echo "✅ 敏感文件历史版本已彻底删除并推送完成。"
echo "⚠️ 建议：吊销相关凭证，并审查配置文件泄露风险。"

