@echo off
setlocal
set "HERE=%~dp0"
if exist "%HERE%..\..\src\miner.js" (
  node "%HERE%..\..\src\miner.js" %*
  exit /b %ERRORLEVEL%
)
if exist "%HERE%src\miner.js" (
  node "%HERE%src\miner.js" %*
  exit /b %ERRORLEVEL%
)
echo perc-mine: could not find src\miner.js
exit /b 1
