@echo off
setlocal
set "HERE=%~dp0"
if exist "%HERE%perc-mine-gui.exe" (
  start "" "%HERE%perc-mine-gui.exe"
  exit /b 0
)
if exist "%HERE%..\..\src\desktop_gui.py" (
  python "%HERE%..\..\src\desktop_gui.py" %*
  exit /b %ERRORLEVEL%
)
if exist "%HERE%src\desktop_gui.py" (
  python "%HERE%src\desktop_gui.py" %*
  exit /b %ERRORLEVEL%
)
echo perc-mine-gui: run perc-mine-gui.exe or python src\desktop_gui.py
exit /b 1
