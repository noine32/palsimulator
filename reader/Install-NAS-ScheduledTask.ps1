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

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -File "' + $runner + '" -Root "' + $Root + '"')
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $Minutes) -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 8)
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host ('Scheduled task installed: ' + $TaskName)
Write-Host ('Interval: ' + $Minutes + ' minute(s)')
Write-Host 'The task runs as SYSTEM and skips overlapping runs.'
