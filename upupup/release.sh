#!/bin/bash
set -e

# ================================
# TMoonTV Release Script
# ================================

if [ -z "$1" ]; then
  echo "❌ 请提供版本号，例如：./release.sh 3.9.1"
  exit 1
fi

VERSION="$1"
echo "=========================================="
echo "🚀 开始发布版本 $VERSION"
echo "=========================================="

# 1. 检查未提交更改
UNSTAGED=$(git status --porcelain)
if [ -n "$UNSTAGED" ]; then
  echo "📁 检测到未提交更改，自动提交..."
  git add .
  git commit -m "chore: auto pre-release commit"
fi

# 2. 拉取最新远程代码
echo "🔄 同步远程仓库..."
git fetch origin
git pull --rebase origin main || { echo "❌ 请先处理冲突或手动同步远程仓库"; exit 1; }

# 3. 更新 VERSION.txt
echo "$VERSION" > VERSION.txt
echo "✅ 更新 VERSION.txt 为 $VERSION"

# 4. 更新 src/lib/version.ts
VERSION_TS_FILE="src/lib/version.ts"
if [ -f "$VERSION_TS_FILE" ]; then
  sed -i "s/^const CURRENT_VERSION = .*/const CURRENT_VERSION = '$VERSION';/" "$VERSION_TS_FILE"
  echo "✅ 更新 version.ts 为 $VERSION"
else
  echo "❌ 找不到 $VERSION_TS_FILE"
  exit 1
fi

# 5. 生成 changelog.ts
echo "📦 生成 changelog.ts..."
node scripts/convert-changelog.js
echo "✅ changelog.ts 已生成"

# 6. 提交更新
git add VERSION.txt src/lib/version.ts src/lib/changelog.ts
git commit -m "chore: release v$VERSION"

# 7. 推送 main 分支
echo "⬆️ 推送 main 分支..."
git push origin main

# 8. 创建并推送 tag
echo "🏷️ 创建 Git tag v$VERSION..."
git tag -f "v$VERSION"
git push origin "v$VERSION" --force

echo "🎉 发布完成: $VERSION"
