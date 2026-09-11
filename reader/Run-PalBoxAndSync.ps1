param(
  [Parameter(Mandatory=$false)][string]$ReaderScript = "",
  [Parameter(Mandatory=$false)][string]$ExportRoot = "",
  [Parameter(Mandatory=$false)][string]$WorkerBaseUrl = "https://palbreeder-api.ryota-k-4869.workers.dev",
  [Parameter(Mandatory=$false)][string]$TokenMapPath = "O:\palworld\palbreeder-secrets\player_tokens.json",
  [Parameter(Mandatory=$false)][string]$PushSecretEnvName = "PALBREEDER_PUSH_SECRET"
)

$ErrorActionPreference = 'Stop'

function Resolve-ExistingPath([string]$Path) {
  if ($Path -and (Test-Path -LiteralPath $Path)) {
    return (Resolve-Path -LiteralPath $Path).Path
  }
  return $null
}

function Find-ExportRoot([string[]]$Roots) {
  $candidates = @()
  foreach ($root in $Roots) {
    if (-not $root -or -not (Test-Path -LiteralPath $root)) { continue }

    if ((Split-Path -Leaf $root) -eq 'PalBoxReader_AllPlayers') {
      $candidates += Get-Item -LiteralPath $root
    }

    $direct = Join-Path $root 'PalBoxReader_AllPlayers'
    if (Test-Path -LiteralPath $direct) {
      $candidates += Get-Item -LiteralPath $direct
    }

    $candidates += Get-ChildItem -LiteralPath $root -Directory -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq 'PalBoxReader_AllPlayers' }
  }

  $valid = $candidates | Where-Object {
    Get-ChildItem -LiteralPath $_.FullName -Directory -Filter 'Player_*' -ErrorAction SilentlyContinue |
      Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'owned_pals.json') } |
      Select-Object -First 1
  } | Sort-Object LastWriteTime -Descending

  if ($valid) { return $valid[0].FullName }
  return $null
}

$repoReaderDir = $PSScriptRoot
$readerRoot = Split-Path -Parent $repoReaderDir

if (-not $ReaderScript) {
  $nearby = @(
    (Join-Path $readerRoot 'PalBoxCommunityReader.ps1'),
    (Join-Path (Split-Path -Parent $readerRoot) 'PalBoxCommunityReader.ps1')
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if ($nearby) { $ReaderScript = $nearby }
}

if (-not $ReaderScript -or -not (Test-Path -LiteralPath $ReaderScript)) {
  throw 'PalBoxCommunityReader.ps1 が見つかりません。-ReaderScript で実ファイルを指定してください。'
}

$pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'Process')
if (-not $pushSecret) { $pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'User') }
if (-not $pushSecret) { $pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'Machine') }
if (-not $pushSecret) {
  throw "$PushSecretEnvName が環境変数に登録されていません。PUSH_SECRETをファイルへ直書きせず、ユーザー環境変数として登録してください。"
}

Write-Host '=== PalBoxCommunityReader start ==='
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ReaderScript
if ($LASTEXITCODE -ne 0) {
  throw "PalBoxCommunityReader failed. ExitCode=$LASTEXITCODE"
}
Write-Host '=== PalBoxCommunityReader complete ==='

if (-not $ExportRoot) {
  $searchRoots = @(
    (Split-Path -Parent $ReaderScript),
    $readerRoot,
    (Split-Path -Parent $readerRoot)
  )

  $shareRootTxt = Join-Path (Split-Path -Parent $ReaderScript) 'ShareRoot.txt'
  if (Test-Path -LiteralPath $shareRootTxt) {
    $shareRoot = (Get-Content -LiteralPath $shareRootTxt -Raw).Trim()
    if ($shareRoot) { $searchRoots += $shareRoot }
  }

  $ExportRoot = Find-ExportRoot -Roots $searchRoots
}

if (-not $ExportRoot -or -not (Test-Path -LiteralPath $ExportRoot)) {
  throw 'PalBoxReader_AllPlayers が自動検出できませんでした。-ExportRoot で指定してください。'
}

$uploader = Join-Path $repoReaderDir 'Upload-PlayerData.ps1'
if (-not (Test-Path -LiteralPath $uploader)) {
  throw "Uploader not found: $uploader"
}

Write-Host "=== Cloud sync start: $ExportRoot ==="
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $uploader `
  -ExportRoot $ExportRoot `
  -WorkerBaseUrl $WorkerBaseUrl `
  -PushSecret $pushSecret `
  -TokenMapPath $TokenMapPath
if ($LASTEXITCODE -ne 0) {
  throw "Cloud upload failed. ExitCode=$LASTEXITCODE"
}
Write-Host '=== Cloud sync complete ==='
