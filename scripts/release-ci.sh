#!/bin/bash
set -e

cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get current version
CURRENT=$(grep '"version"' src-tauri/tauri.conf.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
MAJOR=$(echo "$CURRENT" | cut -d. -f1)
MINOR=$(echo "$CURRENT" | cut -d. -f2)
PATCH=$(echo "$CURRENT" | cut -d. -f3)

# Determine new version
if [ -n "$1" ]; then
    NEW_VERSION="$1"
else
    NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
fi

echo -e "${YELLOW}Bumping ${CURRENT} → ${NEW_VERSION}${NC}"

# Update version in both files
sed -i.bak "s/\"version\": \"${CURRENT}\"/\"version\": \"${NEW_VERSION}\"/" src-tauri/tauri.conf.json && rm -f src-tauri/tauri.conf.json.bak
sed -i.bak "s/^version = \"${CURRENT}\"/version = \"${NEW_VERSION}\"/" src-tauri/Cargo.toml && rm -f src-tauri/Cargo.toml.bak

# Update Cargo.lock
(cd src-tauri && cargo generate-lockfile 2>/dev/null || true)

# Commit and push
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: bump version to ${NEW_VERSION}"
git push

echo -e "${YELLOW}Triggering release workflow...${NC}"
gh workflow run release.yml

echo -e "${GREEN}Done! v${NEW_VERSION} release triggered.${NC}"
echo -e "Track it at: https://github.com/saadnvd1/aTerm/actions"
