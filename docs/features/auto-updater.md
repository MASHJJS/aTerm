# Auto-Updater

aTerm checks for updates on launch and prompts the user to update via the status bar.

## How It Works

1. App launches, waits 3 seconds, then fetches `latest.json` from the latest GitHub release
2. Compares the remote version against the running version
3. If newer, shows "vX.Y.Z available [Update & Restart]" in the status bar
4. User clicks "Update & Restart" to download the update bundle, apply it, and relaunch
5. User can dismiss the banner with the X button

```
GitHub Release (latest)
  ├── aTerm_X.Y.Z_aarch64.dmg     ← First-time install
  ├── aTerm.app.tar.gz             ← Signed update bundle
  └── latest.json                  ← Version manifest with signature

App launch → fetch latest.json → compare versions → show banner → download .tar.gz → apply → restart
```

## Architecture

### Tauri Plugin

Uses `tauri-plugin-updater` (Ed25519 signature verification) and `tauri-plugin-process` (for relaunch).

**Config** (`src-tauri/tauri.conf.json`):
```json
{
  "plugins": {
    "updater": {
      "pubkey": "<Ed25519 public key>",
      "endpoints": [
        "https://github.com/saadnvd1/aterm/releases/latest/download/latest.json"
      ]
    }
  },
  "bundle": {
    "createUpdaterArtifacts": true
  }
}
```

**Capabilities** (`src-tauri/capabilities/desktop.json`):
- `updater:default` — check, download, install
- `process:allow-restart` — relaunch after install

### Frontend

**`src/hooks/useAutoUpdater.ts`** — Hook that manages the update lifecycle:
- Checks for updates 3s after mount (non-blocking)
- Exposes `available`, `version`, `downloading`, `progress`, `error`
- `install()` — downloads, installs, and relaunches
- `dismiss()` — hides the banner

**`src/components/StatusBar.tsx`** — Renders the update banner on the left side:
- "vX.Y.Z available [Update & Restart] [X]" when update found
- "Updating... N%" during download
- "Update failed [Retry] [X]" on error

## Signing Key

The update bundle is signed with an Ed25519 keypair (separate from Apple codesigning).

- **Private key**: `~/.tauri/aterm.key` (needed at build time)
- **Public key**: `~/.tauri/aterm.key.pub` (embedded in `tauri.conf.json`)
- **Password**: stored in `scripts/release.sh` as `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

To regenerate (invalidates all prior versions' update paths):
```bash
npx tauri signer generate -w ~/.tauri/aterm.key
```

## Release Script Integration

`scripts/release.sh` handles everything automatically:

1. Exports `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
2. `tauri build` generates `aTerm.app.tar.gz` + `.sig` alongside the DMG
3. Script constructs `latest.json` from the `.sig` file with the download URL
4. All three files (DMG, tar.gz, latest.json) are uploaded to the GitHub release

## Files

| File | Role |
|------|------|
| `src-tauri/tauri.conf.json` | Updater config (pubkey, endpoint) |
| `src-tauri/capabilities/desktop.json` | Permissions for updater + process restart |
| `src/hooks/useAutoUpdater.ts` | Update check, download, relaunch logic |
| `src/components/StatusBar.tsx` | Update banner UI |
| `scripts/release.sh` | Signing key export, latest.json generation |
| `~/.tauri/aterm.key` | Ed25519 private key (local only) |
