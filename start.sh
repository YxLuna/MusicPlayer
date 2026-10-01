#!/usr/bin/env sh
# CloudMusic Pro 一键启动（macOS / Linux）
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
    echo "❌ 未检测到 Node.js，请先安装：https://nodejs.org/"
    exit 1
fi

exec node 启动器/start-api.js
