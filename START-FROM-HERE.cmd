@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 or later, then open this launcher again.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto failed
  call npx playwright install chromium
  if errorlevel 1 goto failed
)
if not exist dist\index.html (
  call npm run build
  if errorlevel 1 goto failed
)
echo.
echo FROM HERE - open http://127.0.0.1:4176 in your browser.
echo Keep this window open. Press Ctrl+C to stop the application.
echo Configure the AI provider in .env.local before starting the application.
echo Anthropic needs a server-side API key; the optional local profile needs model services.
echo.
call npm start
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo Startup did not finish. See the message above and README.md.
pause
exit /b 1
