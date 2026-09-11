param(
  [string]$Root = 'C:\PalBreeder'
)

$ErrorActionPreference = 'Stop'
$ConfigPath = Join-Path $Root 'nas-config.json'
$ReaderScript = Join-Path $Root 'PalBoxCommunityReader-NAS.ps1'
$Uploader = Join-Path $Root 'Upload-PlayerData.ps1'
$TokenMapPath = Join-Path $Root 'secrets\player_tokens.json'
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
$LogPath = Join-Path $LogDir ('sync_' + (Get-Date -Format 'yyyyMMdd') + '.log')

function Log([string]$Text) {
  $line = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $Text
  Write-Host $line
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
}

function Require-Path([string]$Path,[string]$Label) {
  if (-not (Test-Path -LiteralPath $Path)) { throw ($Label + ' not found: ' + $Path) }
}

try {
  Require-Path $ConfigPath 'Config'
  Require-Path $ReaderScript 'Reader'
  Require-Path $Uploader 'Uploader'

  $cfg = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $WorldPath = [string]$cfg.world_path
  $WorkerBaseUrl = [string]$cfg.worker_base_url
  if (-not $WorldPath) { throw 'world_path is missing in nas-config.json.' }
  if (-not $WorkerBaseUrl) { throw 'worker_base_url is missing in nas-config.json.' }

  $OutputRoot = Join-Path $Root 'Output\PalBoxReader_AllPlayers'
  $WorkRoot = Join-Path $Root 'work'
  $ToolsDir = Join-Path $Root 'tools'

  $pushSecret = [Environment]::GetEnvironmentVariable('PALBREEDER_PUSH_SECRET','Process')
  if (-not $pushSecret) { $pushSecret = [Environment]::GetEnvironmentVariable('PALBREEDER_PUSH_SECRET','User') }
  if (-not $pushSecret) { $pushSecret = [Environment]::GetEnvironmentVariable('PALBREEDER_PUSH_SECRET','Machine') }
  if (-not $pushSecret) { throw 'PALBREEDER_PUSH_SECRET is not configured.' }

  Log 'Reader start.'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ReaderScript `
    -WorldPath $WorldPath `
    -OutputRoot $OutputRoot `
    -WorkRoot $WorkRoot `
    -ToolsDir $ToolsDir
  if ($LASTEXITCODE -ne 0) { throw ('Reader failed. ExitCode=' + $LASTEXITCODE) }
  Log 'Reader complete.'

  Require-Path $OutputRoot 'Export root'
  Log 'Cloud upload start.'
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Uploader `
    -ExportRoot $OutputRoot `
    -WorkerBaseUrl $WorkerBaseUrl `
    -PushSecret $pushSecret `
    -TokenMapPath $TokenMapPath
  if ($LASTEXITCODE -ne 0) { throw ('Cloud upload failed. ExitCode=' + $LASTEXITCODE) }
  Log 'Cloud upload complete.'
  exit 0
}
catch {
  Log ('ERROR: ' + $_.Exception.Message)
  Log (($_ | Out-String).Trim())
  exit 1
}
