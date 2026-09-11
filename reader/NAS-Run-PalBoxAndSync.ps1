param(
  [string]$Root = 'C:\PalBreeder',
  [string]$WorkerBaseUrl = 'https://palbreeder-api.ryota-k-4869.workers.dev',
  [string]$PushSecretEnvName = 'PALBREEDER_PUSH_SECRET'
)

$ErrorActionPreference = 'Stop'

$ReaderScript = Join-Path $Root 'Reader\PalBoxCommunityReader.ps1'
$ExportRoot = Join-Path $Root 'Output\PalBoxReader_AllPlayers'
$Uploader = Join-Path $Root 'Upload-PlayerData.ps1'
$TokenMapPath = Join-Path $Root 'secrets\player_tokens.json'

function Require-Path([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label not found: $Path"
  }
}

Require-Path $ReaderScript 'Reader script'
Require-Path $Uploader 'Uploader'

$pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'Process')
if (-not $pushSecret) { $pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'User') }
if (-not $pushSecret) { $pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'Machine') }
if (-not $pushSecret) {
  throw "$PushSecretEnvName is not configured. Register PUSH_SECRET as a Windows environment variable."
}

Write-Host "=== Reader start ==="
Write-Host "Reader: $ReaderScript"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ReaderScript
$readerExit = $LASTEXITCODE
if ($readerExit -ne 0) {
  throw "Reader failed. ExitCode=$readerExit"
}
Write-Host "=== Reader complete ==="

Require-Path $ExportRoot 'Export root'

Write-Host "=== Cloud upload start ==="
Write-Host "Export: $ExportRoot"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Uploader `
  -ExportRoot $ExportRoot `
  -WorkerBaseUrl $WorkerBaseUrl `
  -PushSecret $pushSecret `
  -TokenMapPath $TokenMapPath
$uploadExit = $LASTEXITCODE
if ($uploadExit -ne 0) {
  throw "Cloud upload failed. ExitCode=$uploadExit"
}

Write-Host "=== Cloud upload complete ==="
Write-Host "Done."
