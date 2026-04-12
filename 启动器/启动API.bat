@echo off
chcp 65001 >nul
title 网易云API启动器
cd /d "%~dp0"
echo.
echo ========================================
echo    网易云音乐API启动器
echo ========================================
echo.
node start-api.js
echo.
pause
