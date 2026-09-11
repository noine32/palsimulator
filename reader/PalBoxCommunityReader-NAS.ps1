param(
  [Parameter(Mandatory=$true)][string]$WorldPath,
  [Parameter(Mandatory=$true)][string]$OutputRoot,
  [Parameter(Mandatory=$false)][string]$WorkRoot = "C:\PalBreeder\work",
  [Parameter(Mandatory=$false)][string]$ToolsDir = "C:\PalBreeder\tools"
)

$ErrorActionPreference = 'Stop'

function Find-World([string]$Path) {
  if ((Test-Path -LiteralPath (Join-Path $Path 'Level.sav')) -and (Test-Path -LiteralPath (Join-Path $Path 'Players'))) {
    return (Resolve-Path -LiteralPath $Path).Path
  }
  $f = Get-ChildItem -LiteralPath $Path -Filter 'Level.sav' -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\backup\\' -and (Test-Path -LiteralPath (Join-Path $_.Directory.FullName 'Players')) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($f) { return $f.Directory.FullName }
  return $null
}

function Copy-Snapshot([string]$World) {
  New-Item -ItemType Directory -Path $WorkRoot -Force | Out-Null
  $level = Join-Path $World 'Level.sav'
  $before = (Get-FileHash -LiteralPath $level -Algorithm SHA256).Hash
  $dest = Join-Path $WorkRoot ('WorkCopy_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
  New-Item -ItemType Directory -Path $dest -Force | Out-Null
  Copy-Item -LiteralPath $level -Destination (Join-Path $dest 'Level.sav') -Force
  Copy-Item -LiteralPath (Join-Path $World 'Players') -Destination (Join-Path $dest 'Players') -Recurse -Force
  $after = (Get-FileHash -LiteralPath $level -Algorithm SHA256).Hash
  $copy = (Get-FileHash -LiteralPath (Join-Path $dest 'Level.sav') -Algorithm SHA256).Hash
  if ($before -ne $after) { throw 'Server Level.sav changed during copy. Retry on the next run.' }
  if ($before -ne $copy) { throw 'Copied Level.sav hash mismatch.' }
  @(
    'Source=' + $World,
    'Destination=' + $dest,
    'SourceHashBefore=' + $before,
    'SourceHashAfter=' + $after,
    'CopyHash=' + $copy,
    'SourceUnchanged=' + ($before -eq $after),
    'CopyIdentical=' + ($before -eq $copy)
  ) | Set-Content -LiteralPath (Join-Path $dest 'READ_ONLY_COPY_REPORT.txt') -Encoding UTF8
  return $dest
}

function Find-SavCli {
  if (-not (Test-Path -LiteralPath $ToolsDir)) { return $null }
  $f = Get-ChildItem -LiteralPath $ToolsDir -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^sav_cli(\.exe)?$' } |
    Select-Object -First 1
  if ($f) { return $f.FullName }
  return $null
}

function Install-SavCli {
  New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null
  $api = 'https://api.github.com/repos/zaigie/palworld-server-tool/releases/latest'
  $rel = Invoke-RestMethod -Uri $api -Headers @{ 'User-Agent' = 'PalBoxCommunityReader-NAS' }
  $asset = $rel.assets | Where-Object {
    $_.name -match '(?i)windows' -and $_.name -match '(?i)(amd64|x86_64|x64)' -and $_.name -match '(?i)\.zip$'
  } | Select-Object -First 1
  if (-not $asset) {
    $asset = $rel.assets | Where-Object { $_.name -match '(?i)windows' -and $_.name -match '(?i)\.zip$' } | Select-Object -First 1
  }
  if (-not $asset) { throw 'Could not find a Windows parser ZIP in the latest release.' }
  $zip = Join-Path $ToolsDir 'pst_windows.zip'
  $curl = Join-Path $env:SystemRoot 'System32\curl.exe'
  if (-not (Test-Path -LiteralPath $curl)) { $curl = 'curl.exe' }
  $args = @('--fail','--location','--retry','5','--retry-delay','3','--retry-all-errors','--connect-timeout','30','--output',$zip,$asset.browser_download_url)
  $cp = Start-Process -FilePath $curl -ArgumentList $args -Wait -PassThru -NoNewWindow
  if ($cp.ExitCode -ne 0) { throw ('Parser download failed. curl exit code: ' + $cp.ExitCode) }
  $out = Join-Path $ToolsDir 'pst'
  if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Recurse -Force }
  Expand-Archive -LiteralPath $zip -DestinationPath $out -Force
  Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue
  $cli = Find-SavCli
  if (-not $cli) { throw 'sav_cli was not found after parser installation.' }
  return $cli
}

function Run-Parser([string]$Snapshot,[string]$Cli) {
  $json = Join-Path $Snapshot 'structure.json'
  if (Test-Path -LiteralPath $json) { Remove-Item -LiteralPath $json -Force }
  $p = Start-Process -FilePath $Cli -ArgumentList @('-f',(Join-Path $Snapshot 'Level.sav'),'-o',$json) -WorkingDirectory (Split-Path -Parent $Cli) -Wait -PassThru -NoNewWindow
  if ($p.ExitCode -ne 0) { throw ('sav_cli exited with code ' + $p.ExitCode) }
  if (-not (Test-Path -LiteralPath $json)) { throw 'structure.json was not created.' }
  return $json
}

function Convert-PassiveValue($Value) {
  $out = New-Object System.Collections.Generic.List[string]
  if ($null -eq $Value) { return @() }
  if ($Value -is [string]) {
    $s = ([string]$Value).Trim()
    if ($s) { $out.Add($s) }
    return @($out)
  }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    foreach ($item in $Value) {
      foreach ($x in @(Convert-PassiveValue $item)) { if ($x) { $out.Add([string]$x) } }
    }
    return @($out)
  }
  if ($Value.PSObject) {
    foreach ($k in @('name','Name','value','Value','id','ID','skill_id','SkillID','skill_name','SkillName')) {
      if ($Value.PSObject.Properties.Name -contains $k) {
        foreach ($x in @(Convert-PassiveValue $Value.$k)) { if ($x) { $out.Add([string]$x) } }
      }
    }
  }
  return @($out)
}

function Get-PassiveSkillIDs($Pal) {
  $found = New-Object System.Collections.Generic.List[string]
  if ($Pal.PSObject.Properties.Name -contains 'skills') {
    foreach ($x in @(Convert-PassiveValue $Pal.skills)) {
      $s = ([string]$x).Trim()
      if ($s) { $found.Add($s) }
    }
  }
  return @($found | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() } | Sort-Object -Unique)
}

function Get-PalRows($Player) {
  $rows = @()
  foreach ($pal in @($Player.pals)) {
    $id = ''
    foreach ($k in @('type','character_id','CharacterID','id')) {
      if ($pal.PSObject.Properties.Name -contains $k) {
        $id = [string]$pal.$k
        if ($id) { break }
      }
    }
    $rows += [PSCustomObject]@{
      InternalID = $id
      Level = $pal.level
      Gender = $pal.gender
      Nickname = $pal.nickname
      PassiveSkillIDs = ((Get-PassiveSkillIDs $pal) -join '|')
    }
  }
  return @($rows)
}

function Write-PlayerPackage($Player,[string]$PlayerDir,[string]$GeneratedAt) {
  New-Item -ItemType Directory -Path $PlayerDir -Force | Out-Null
  $rows = @(Get-PalRows $Player)
  $rows | Export-Csv -LiteralPath (Join-Path $PlayerDir 'owned_pals_all.csv') -NoTypeInformation -Encoding UTF8
  $species = @()
  foreach ($g in ($rows | Group-Object InternalID | Sort-Object Count -Descending)) {
    $species += [PSCustomObject]@{ InternalID = $g.Name; Count = $g.Count }
  }
  $species | Export-Csv -LiteralPath (Join-Path $PlayerDir 'owned_pals_species.csv') -NoTypeInformation -Encoding UTF8
  $palsJson = @()
  foreach ($r in $rows) {
    $skills = @()
    if ($r.PassiveSkillIDs) { $skills = @(([string]$r.PassiveSkillIDs) -split '\|' | Where-Object { $_ }) }
    $palsJson += [PSCustomObject]@{
      internal_id = [string]$r.InternalID
      level = $r.Level
      gender = [string]$r.Gender
      nickname = [string]$r.Nickname
      passive_skill_ids = @($skills)
    }
  }
  $package = [PSCustomObject]@{
    schema = 'palbreeder-owned-pals-v1'
    generated_at = $GeneratedAt
    player = [PSCustomObject]@{
      nickname = [string]$Player.nickname
      level = $Player.level
      uid = [string]$Player.player_uid
      owned_pal_count = $rows.Count
    }
    pals = @($palsJson)
  }
  $package | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $PlayerDir 'owned_pals.json') -Encoding UTF8
  return @($rows)
}

function Export-AllPlayers([string]$Json) {
  $data = Get-Content -LiteralPath $Json -Raw -Encoding UTF8 | ConvertFrom-Json
  $players = @($data.players)
  if ($players.Count -eq 0) { throw 'No players were found.' }
  if (Test-Path -LiteralPath $OutputRoot) { Remove-Item -LiteralPath $OutputRoot -Recurse -Force }
  New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
  $generatedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')
  $index = @()
  foreach ($player in $players) {
    $uid = [string]$player.player_uid
    if (-not $uid) { $uid = 'unknown_' + ([guid]::NewGuid().ToString('N').Substring(0,8)) }
    $folderName = 'Player_' + $uid
    $rows = @(Write-PlayerPackage $player (Join-Path $OutputRoot $folderName) $generatedAt)
    $index += [PSCustomObject]@{
      nickname = [string]$player.nickname
      level = $player.level
      uid = [string]$player.player_uid
      owned_pal_count = $rows.Count
      folder = $folderName
      generated_at = $generatedAt
    }
  }
  $index | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputRoot 'players_index.json') -Encoding UTF8
  $index | Export-Csv -LiteralPath (Join-Path $OutputRoot 'players_index.csv') -NoTypeInformation -Encoding UTF8
  return $players.Count
}

$world = Find-World $WorldPath
if (-not $world) { throw ('World folder not found under: ' + $WorldPath) }
Write-Host ('World: ' + $world)
$snapshot = Copy-Snapshot $world
Write-Host ('Snapshot: ' + $snapshot)
$cli = Find-SavCli
if (-not $cli) { $cli = Install-SavCli }
$json = Run-Parser $snapshot $cli
$count = Export-AllPlayers $json
Write-Host ('Exported players: ' + $count)
Write-Host ('Output: ' + $OutputRoot)

# Keep only the 3 newest work copies.
Get-ChildItem -LiteralPath $WorkRoot -Directory -Filter 'WorkCopy_*' -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 3 |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
