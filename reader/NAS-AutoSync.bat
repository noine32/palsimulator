@echo off
setlocal
set ROOT=C:\PalBreeder
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%\NAS-Run-PalBoxAndSync.ps1" -Root "%ROOT%"
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="0" (
  echo.
  echo [ERROR] NAS reader or cloud sync failed. ExitCode=%EXITCODE%
  pause
  exit /b %EXITCODE%
)
echo.
echo [OK] Reader and cloud sync completed.
exit /b 0
