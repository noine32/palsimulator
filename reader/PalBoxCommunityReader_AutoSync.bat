@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Run-PalBoxAndSync.ps1"
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo [ERROR] Reader or cloud sync failed. ExitCode=%EXITCODE%
  pause
)
exit /b %EXITCODE%
