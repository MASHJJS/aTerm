# Releasing aTerm

## Prerequisites

- Apple Developer account with Developer ID Application certificate
- App-specific password for notarization
- GitHub CLI (`gh`) authenticated

## Setup (One-time)

### Tauri Signing Key

Generate an Ed25519 keypair for update bundle signing:

```bash
mkdir -p ~/.tauri
npx tauri signer generate -w ~/.tauri/aterm.key
```

The public key is embedded in `src-tauri/tauri.conf.json`. If you regenerate the key, update the `pubkey` field there too.

### Apple Credentials

Create `src-tauri/.env.local` with your Apple credentials:

```bash
export APPLE_TEAM_ID="XXXXXXXXXX"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (XXXXXXXXXX)"
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
```

To get these values:

1. **Team ID**: Found in Apple Developer Portal under Membership
2. **Signing Identity**: Run `security find-identity -v -p codesigning`
3. **App-specific password**: Generate at https://appleid.apple.com/account/manage

## Creating a Release

1. Update version in both files:
   - `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`
   - `src-tauri/Cargo.toml` → `version = "X.Y.Z"`

2. Commit the version bump:
   ```bash
   git add -A && git commit -m "chore: bump version to X.Y.Z" && git push
   ```

3. Run the release script:
   ```bash
   ./scripts/release.sh
   ```

The script will:
- Load the Tauri signing key from `~/.tauri/aterm.key`
- Build the app in release mode (generates DMG + update bundle)
- Sign with your Developer ID certificate
- Submit to Apple for notarization
- Wait for notarization to complete
- Staple the notarization ticket to the DMG
- Generate `latest.json` for the auto-updater
- Create a GitHub release with the DMG, update bundle, and `latest.json` attached

## Output

Builds are located at:
- App bundle: `src-tauri/target/release/bundle/macos/aTerm.app`
- DMG installer: `src-tauri/target/release/bundle/dmg/aTerm_X.Y.Z_aarch64.dmg`
- Update bundle: `src-tauri/target/release/bundle/macos/aTerm.app.tar.gz`
- Update signature: `src-tauri/target/release/bundle/macos/aTerm.app.tar.gz.sig`
- Update manifest: `src-tauri/target/release/bundle/macos/latest.json`

## Troubleshooting

### "Release already exists"
Update the version numbers and try again.

### Notarization fails
- Check Apple ID credentials in `.env.local`
- Ensure app-specific password is valid
- Check for hardened runtime issues: `codesign -dvvv /path/to/app`

### Signing identity not found
Run `security find-identity -v -p codesigning` and update `APPLE_SIGNING_IDENTITY` in `.env.local`.
