param(
  [Parameter(Mandatory=$false)][string]$ReaderScript = "",
  [Parameter(Mandatory=$false)][string]$ExportRoot = "",
  [Parameter(Mandatory=$false)][string]$WorkerBaseUrl = "https://palbreeder-api.ryota-k-4869.workers.dev",
  [Parameter(Mandatory=$false)][string]$TokenMapPath = "O:\palworld\palbreeder-secrets\player_tokens.json",
  [Parameter(Mandatory=$false)][string]$PushSecretEnvName = "PALBREEDER_PUSH_SECRET"
)

$ErrorActionPreference = 'Stop'

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

function Find-ReaderScript([string[]]$Roots) {
  foreach ($root in $Roots) {
    if (-not $root -or -not (Test-Path -LiteralPath $root)) { continue }

    $direct = Join-Path $root 'PalBoxCommunityReader.ps1'
    if (Test-Path -LiteralPath $direct) {
      return (Resolve-Path -LiteralPath $direct).Path
    }

    $found = Get-ChildItem -LiteralPath $root -File -Filter 'PalBoxCommunityReader.ps1' -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notlike '*\palsimulator\reader\*' } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return $null
}

$scriptDir = $PSScriptRoot
$parentDir = Split-Path -Parent $scriptDir
$grandParentDir = Split-Path -Parent $parentDir

if (-not $ReaderScript) {
  $readerSearchRoots = @(
    $scriptDir,
    $parentDir,
    $grandParentDir,
    'O:\palworld'
  )
  $ReaderScript = Find-ReaderScript -Roots $readerSearchRoots
}

if (-not $ReaderScript -or -not (Test-Path -LiteralPath $ReaderScript)) {
  throw 'PalBoxCommunityReader.ps1 was not found automatically. Use -ReaderScript to specify the actual file.'
}

Write-Host "Reader script: $ReaderScript"

$pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'Process')
if (-not $pushSecret) { $pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'User') }
if (-not $pushSecret) { $pushSecret = [Environment]::GetEnvironmentVariable($PushSecretEnvName, 'Machine') }
if (-not $pushSecret) {
  throw "$PushSecretEnvName is not registered as an environment variable. Store PUSH_SECRET as a user environment variable instead of writing it into a file."
}

Write-Host '=== PalBoxCommunityReader start ==='
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ReaderScript
if ($LASTEXITCODE -ne 0) {
  throw "PalBoxCommunityReader failed. ExitCode=$LASTEXITCODE"
}
Write-Host '=== PalBoxCommunityReader complete ==='

if (-not $ExportRoot) {
  $readerDir = Split-Path -Parent $ReaderScript
  $searchRoots = @(
    $readerDir,
    $scriptDir,
    $parentDir,
    $grandParentDir,
    'O:\palworld'
  )

  $shareRootTxt = Join-Path $readerDir 'ShareRoot.txt'
  if (Test-Path -LiteralPath $shareRootTxt) {
    $shareRoot = (Get-Content -LiteralPath $shareRootTxt -Raw).Trim()
    if ($shareRoot) { $searchRoots += $shareRoot }
  }

  $ExportRoot = Find-ExportRoot -Roots $searchRoots
}

if (-not $ExportRoot -or -not (Test-Path -LiteralPath $ExportRoot)) {
  throw 'PalBoxReader_AllPlayers could not be found automatically. Use -ExportRoot to specify it.'
}

$uploaderCandidates = @(
  (Join-Path $scriptDir 'Upload-PlayerData.ps1'),
  (Join-Path $parentDir 'reader\Upload-PlayerData.ps1')
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $uploaderCandidates) {
  throw 'Upload-PlayerData.ps1 was not found. Put it in the same folder as Run-PalBoxAndSync.ps1.'
}
$uploader = $uploaderCandidates

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
