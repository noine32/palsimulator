param(
  [string]$InstallRoot = 'C:\PalBreeder',
  [string]$WorkerBaseUrl = 'https://palbreeder-api.ryota-k-4869.workers.dev'
)

$ErrorActionPreference = 'Stop'
$SourceDir = $PSScriptRoot

Write-Host 'PalBreeder NAS setup'
Write-Host ('Install root: ' + $InstallRoot)

$worldPath = Read-Host 'Enter the Palworld save folder (or a parent folder containing Level.sav)'
if (-not $worldPath -or -not (Test-Path -LiteralPath $worldPath)) {
  throw 'The specified Palworld path does not exist.'
}

$secure = Read-Host 'Enter Cloudflare PUSH_SECRET' -AsSecureString
$cred = New-Object System.Management.Automation.PSCredential('x',$secure)
$pushSecret = $cred.GetNetworkCredential().Password
if (-not $pushSecret) { throw 'PUSH_SECRET was empty.' }

New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
foreach ($dir in @('Output','work','tools','secrets','logs')) {
  New-Item -ItemType Directory -Path (Join-Path $InstallRoot $dir) -Force | Out-Null
}

$files = @(
  'PalBoxCommunityReader-NAS.ps1',
  'Upload-PlayerData.ps1',
  'NAS-Run-PalBoxAndSync.ps1',
  'NAS-AutoSync.bat',
  'Install-NAS-ScheduledTask.ps1'
)
foreach ($name in $files) {
  $src = Join-Path $SourceDir $name
  if (-not (Test-Path -LiteralPath $src)) { throw ('Required setup file is missing: ' + $src) }
  Copy-Item -LiteralPath $src -Destination (Join-Path $InstallRoot $name) -Force
}

$config = [PSCustomObject]@{
  world_path = (Resolve-Path -LiteralPath $worldPath).Path
  worker_base_url = $WorkerBaseUrl.TrimEnd('/')
}
$config | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $InstallRoot 'nas-config.json') -Encoding UTF8

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  [Environment]::SetEnvironmentVariable('PALBREEDER_PUSH_SECRET',$pushSecret,'Machine')
  Write-Host 'PUSH_SECRET stored as a Machine environment variable.'
} else {
  [Environment]::SetEnvironmentVariable('PALBREEDER_PUSH_SECRET',$pushSecret,'User')
  Write-Host 'PUSH_SECRET stored as a User environment variable.'
  Write-Warning 'Run Setup-NAS.ps1 as Administrator before installing the SYSTEM scheduled task.'
}
$env:PALBREEDER_PUSH_SECRET = $pushSecret
$pushSecret = $null
$cred = $null

Write-Host ''
Write-Host 'Running the first sync test...'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $InstallRoot 'NAS-Run-PalBoxAndSync.ps1') -Root $InstallRoot
if ($LASTEXITCODE -ne 0) {
  throw ('First sync test failed. Check ' + (Join-Path $InstallRoot 'logs'))
}

Write-Host ''
Write-Host 'Setup and first sync completed successfully.'
Write-Host ('Config: ' + (Join-Path $InstallRoot 'nas-config.json'))
Write-Host ('Tokens: ' + (Join-Path $InstallRoot 'secrets\player_tokens.json'))
Write-Host ''
Write-Host 'Next: run Install-NAS-ScheduledTask.ps1 as Administrator to enable automatic sync.'
