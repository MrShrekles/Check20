@echo off
cd /d "%~dp0"
echo Starting Forge...
start "Forge" cmd /k node server.js
timeout /t 2 /nobreak >nul
start http://localhost:3000
