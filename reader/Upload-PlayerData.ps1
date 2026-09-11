param(
  [Parameter(Mandatory=$true)][string]$ExportRoot,
  [Parameter(Mandatory=$true)][string]$WorkerBaseUrl,
  [Parameter(Mandatory=$true)][string]$PushSecret,
  [Parameter(Mandatory=$false)][string]$TokenMapPath = ""
)

$ErrorActionPreference = 'Stop'
$WorkerBaseUrl = $WorkerBaseUrl.TrimEnd('/')

function New-ReadToken {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function Invoke-JsonPost([string]$Url, [string]$Body) {
  Invoke-RestMethod -Method Post -Uri $Url -Headers @{ Authorization = "Bearer $PushSecret" } -ContentType 'application/json; charset=utf-8' -Body $Body
}

if (-not (Test-Path -LiteralPath $ExportRoot)) { throw "ExportRoot not found: $ExportRoot" }

$tokenMap = @{}
if ($TokenMapPath -and (Test-Path -LiteralPath $TokenMapPath)) {
  $loaded = Get-Content -LiteralPath $TokenMapPath -Raw | ConvertFrom-Json -AsHashtable
  if ($loaded) { $tokenMap = $loaded }
}

$files = Get-ChildItem -LiteralPath $ExportRoot -Directory -Filter 'Player_*' | ForEach-Object {
  $json = Join-Path $_.FullName 'owned_pals.json'
  if (Test-Path -LiteralPath $json) { Get-Item -LiteralPath $json }
}

if (-not $files) { throw 'No Player_*/owned_pals.json files found.' }

$result = @()
foreach ($file in $files) {
  $raw = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  $data = $raw | ConvertFrom-Json
  if ($data.schema -ne 'palbreeder-owned-pals-v1') { throw "Invalid schema: $($file.FullName)" }
  $uid = [string]$data.player.uid
  if ($uid -notmatch '^\d{1,20}$') { throw "Invalid player uid in $($file.FullName)" }

  $pushUrl = "$WorkerBaseUrl/api/v1/player/$uid"
  Invoke-JsonPost -Url $pushUrl -Body $raw | Out-Null

  if (-not $tokenMap.ContainsKey($uid)) {
    $tokenMap[$uid] = New-ReadToken
    $body = @{ uid = $uid; read_token = $tokenMap[$uid] } | ConvertTo-Json -Compress
    Invoke-JsonPost -Url "$WorkerBaseUrl/api/v1/admin/player-token" -Body $body | Out-Null
  }

  $result += [pscustomobject]@{
    uid = $uid
    nickname = [string]$data.player.nickname
    owned_pal_count = [int]$data.player.owned_pal_count
    uploaded = $true
  }
}

if ($TokenMapPath) {
  $dir = Split-Path -Parent $TokenMapPath
  if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $tokenMap | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $TokenMapPath -Encoding UTF8
}

$result | Format-Table -AutoSize
Write-Host "Uploaded $($result.Count) player file(s)."
if (-not $TokenMapPath) {
  Write-Warning 'TokenMapPath was not specified. New read tokens were not persisted locally.'
}
