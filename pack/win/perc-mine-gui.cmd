@echo off
setlocal
set "HERE=%~dp0"
if exist "%HERE%..\..\src\gui.js" (
  node "%HERE%..\..\src\gui.js" %*
  exit /b %ERRORLEVEL%
)
if exist "%HERE%src\gui.js" (
  node "%HERE%src\gui.js" %*
  exit /b %ERRORLEVEL%
)
echo perc-mine-gui: could not find src\gui.js
exit /b 1
