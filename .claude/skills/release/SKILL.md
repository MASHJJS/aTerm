---
name: release
description: Cut a new release (build, sign, notarize, publish to GitHub)
allowed-tools: Bash, Read, Edit
---

# Release Skill

Use this skill when the user says "cut a release", "release", "cut a new release", "publish a release", or similar.

## Two Modes

### 1. CI Release (default)

Triggered by: "cut a release", "release", "new release", etc.

Bumps the version, pushes, and triggers the GitHub Actions workflow to build, sign, notarize, and publish.

1. **Run the CI release script**:
   ```bash
   ./scripts/release-ci.sh
   ```

2. **If the release tag already exists**, automatically:
   - Bump the patch version again (e.g., 0.1.30 → 0.1.31)
   - Re-run: `./scripts/release-ci.sh`
   - **Do NOT stop or ask the user** - just handle it automatically

3. Report that the release was triggered and link to: https://github.com/saadnvd1/aTerm/actions

### 2. Local Release

Triggered by: "cut a release locally", "release manually", "local release", "manual release", etc.

Builds, signs, notarizes, and publishes entirely from the local machine.

1. **Run the local release script**:
   ```bash
   ./scripts/release.sh
   ```

2. **If the script says "Release vX.Y.Z already exists"**, automatically:
   - Bump the patch version in both:
     - `src-tauri/tauri.conf.json`
     - `src-tauri/Cargo.toml`
   - Commit with `chore: bump version to X.Y.Z`
   - Re-run `./scripts/release.sh`
   - **Do NOT stop or ask the user** - just handle it automatically

3. **If the script fails for other reasons**, you can manually:
   - Build: `npm run tauri build`
   - Create release: `gh release create v{VERSION} --title "aTerm v{VERSION}" --generate-notes src-tauri/target/release/bundle/dmg/aTerm_{VERSION}_aarch64.dmg`

4. Report the release URL when done.

## Requirements

- `gh` CLI authenticated
- For local releases: Apple signing credentials in `src-tauri/.env.local`
- For CI releases: GitHub Actions secrets configured (APPLE_CERTIFICATE, etc.)
