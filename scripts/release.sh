#!/usr/bin/env bash
set -euo pipefail

VERSION="$1"

if [[ -z "$VERSION" ]]; then
  echo "❌ 请提供版本号，例如: ./release.sh 3.9.1"
  exit 1
fi

echo "=========================================="
echo "🚀 开始发布版本 $VERSION"
echo "=========================================="

# 1️⃣ 检查 Git 仓库干净
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "📁 检测到未提交更改，自动提交..."
  git add -A
  git commit -m "chore: auto pre-release commit"
fi

# 2️⃣ 同步远程
echo "🔄 同步远程仓库..."
git fetch origin main
git pull --rebase origin main

# 3️⃣ 更新 version.ts 和 VERSION.txt
VERSION_TS="src/lib/version.ts"
VERSION_TXT="VERSION.txt"
CHANGELOG="CHANGELOG"

if [[ ! -f "$VERSION_TS" ]]; then
  echo "❌ 找不到 $VERSION_TS"
  exit 1
fi

echo "🔢 更新 src/lib/version.ts..."
sed -i "s/const CURRENT_VERSION = ['\"].*['\"]/const CURRENT_VERSION = '$VERSION'/" "$VERSION_TS"

echo "🔢 更新 VERSION.txt..."
echo "$VERSION" > "$VERSION_TXT"

# 4️⃣ 生成 changelog.ts
CHANGELOG_TS="src/lib/changelog.ts"
echo "📦 生成 changelog.ts..."
node scripts/convert-changelog.js

# 5️⃣ 提交变更
echo "📁 添加变更文件..."
git add "$VERSION_TS" "$VERSION_TXT" "$CHANGELOG_TS" "$CHANGELOG"

echo "📝 提交代码..."
git commit -m "chore: release v$VERSION"

# 6️⃣ 推送 main
echo "⬆️ 推送 main 分支..."
git push origin main

# 7️⃣ 创建 tag 并 push
echo "🏷️ 创建 git tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"
git push origin "v$VERSION"

echo "🎉 发布完成: v$VERSION"
echo "💡 接下来可构建 Docker 镜像或触发 CI/CD"
