# PalBreeder NAS automatic sync

Windows PC running the Palworld server can also run the PalBox reader and upload only per-player `owned_pals.json` data to the Cloudflare Worker.

## Files

- `PalBoxCommunityReader-NAS.ps1` - headless reader for scheduled execution
- `Upload-PlayerData.ps1` - uploads each player's minimal JSON to Cloudflare
- `NAS-Run-PalBoxAndSync.ps1` - runs reader then uploader
- `NAS-AutoSync.bat` - manual one-click test launcher
- `Setup-NAS.ps1` - one-time installer/configurator
- `Install-NAS-ScheduledTask.ps1` - installs recurring Windows Scheduled Task

## Recommended install layout

```text
C:\PalBreeder\
  PalBoxCommunityReader-NAS.ps1
  Upload-PlayerData.ps1
  NAS-Run-PalBoxAndSync.ps1
  NAS-AutoSync.bat
  Install-NAS-ScheduledTask.ps1
  nas-config.json
  Output\PalBoxReader_AllPlayers\
  work\
  tools\
  secrets\player_tokens.json
  logs\
```

## One-time setup

Open PowerShell as Administrator in the repository's `reader` folder and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Setup-NAS.ps1
```

The setup asks for:

1. The local Palworld save folder, or a parent folder containing `Level.sav` and `Players`.
2. The existing Cloudflare `PUSH_SECRET`.

It then copies the required scripts to `C:\PalBreeder`, writes `nas-config.json`, stores `PALBREEDER_PUSH_SECRET` as a Windows Machine environment variable, and performs the first full sync test.

The secret is not written to the repository or `nas-config.json`.

## Test manually

```text
C:\PalBreeder\NAS-AutoSync.bat
```

A successful run exports the player packages and uploads them to Cloudflare. Logs are written under `C:\PalBreeder\logs`.

## Enable automatic sync

After the first test succeeds, run PowerShell as Administrator:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\PalBreeder\Install-NAS-ScheduledTask.ps1 -Minutes 10
```

The task is named `PalBreeder-NAS-Sync`, runs as `SYSTEM`, and ignores overlapping runs.

## Security model

- The live Palworld save is never modified. The reader makes a local snapshot and checks the `Level.sav` SHA-256 hash before/after copying.
- Only the minimal per-player `owned_pals.json` is uploaded.
- `PUSH_SECRET` remains on the Windows server and Cloudflare Worker only.
- Player Read Tokens remain in `C:\PalBreeder\secrets\player_tokens.json` and should be shared only with the corresponding player.
- GitHub Pages never contains Palworld save data, `PUSH_SECRET`, Read Tokens, or player JSON.

## Notes

The first run downloads the Windows release of `zaigie/palworld-server-tool` into `C:\PalBreeder\tools` if `sav_cli` is not already installed. Work snapshots are automatically trimmed to the newest three copies.
