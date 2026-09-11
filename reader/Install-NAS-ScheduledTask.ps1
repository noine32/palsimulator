param(
  [string]$Root = 'C:\PalBreeder',
  [int]$Minutes = 10,
  [string]$TaskName = 'PalBreeder-NAS-Sync'
)

$ErrorActionPreference = 'Stop'
if ($Minutes -lt 1) { throw 'Minutes must be 1 or greater.' }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run this script as Administrator.' }

$runner = Join-Path $Root 'NAS-Run-PalBoxAndSync.ps1'
if (-not (Test-Path -LiteralPath $runner)) { throw ('Runner not found: ' + $runner) }

$machineSecret = [Environment]::GetEnvironmentVariable('PALBREEDER_PUSH_SECRET','Machine')
if (-not $machineSecret) {
  throw 'PALBREEDER_PUSH_SECRET is not stored as a Machine environment variable. Re-run Setup-NAS.ps1 as Administrator.'
}

$taskCommand = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + $runner + '" -Root "' + $Root + '"'
$args = @(
  '/Create',
  '/TN', $TaskName,
  '/TR', $taskCommand,
  '/SC', 'MINUTE',
  '/MO', [string]$Minutes,
  '/RU', 'SYSTEM',
  '/RL', 'HIGHEST',
  '/F'
)

$p = Start-Process -FilePath 'schtasks.exe' -ArgumentList $args -Wait -PassThru -NoNewWindow
if ($p.ExitCode -ne 0) { throw ('schtasks.exe failed. ExitCode=' + $p.ExitCode) }

Write-Host ('Scheduled task installed: ' + $TaskName)
Write-Host ('Interval: ' + $Minutes + ' minute(s)')
Write-Host 'The task runs as SYSTEM.'
