# Development Guide

## Running aTerm

### Development Mode

```bash
npm run tauri:dev
```

Visual indicators in dev mode:
- **Cyan app icon** in dock/taskbar
- **"aTerm [DEV]"** window title
- **"DEV" badge** in sidebar header

### Production Build

```bash
npm run tauri build
```

Uses the **production icon** and creates a distributable app bundle.

## Icons

| Environment | Icon Location | Description |
|-------------|---------------|-------------|
| Development | `src-tauri/icons-dev/` | Cyan circuit-T icon |
| Production | `src-tauri/icons/` | Orange/pink gradient icon |

The dev config (`src-tauri/tauri.dev.json`) overrides only the icon paths, merging with the main `tauri.conf.json`.

## Regenerating Dev Icons

If you need to regenerate dev icons from a new source image:

```bash
cd src-tauri/icons-dev
SOURCE="/path/to/source.png"

# PNG sizes
magick "$SOURCE" -resize 32x32 32x32.png
magick "$SOURCE" -resize 128x128 128x128.png
magick "$SOURCE" -resize 256x256 "128x128@2x.png"
magick "$SOURCE" -resize 512x512 icon.png

# macOS .icns
mkdir -p icon.iconset
magick "$SOURCE" -resize 16x16 icon.iconset/icon_16x16.png
magick "$SOURCE" -resize 32x32 icon.iconset/icon_16x16@2x.png
magick "$SOURCE" -resize 32x32 icon.iconset/icon_32x32.png
magick "$SOURCE" -resize 64x64 icon.iconset/icon_32x32@2x.png
magick "$SOURCE" -resize 128x128 icon.iconset/icon_128x128.png
magick "$SOURCE" -resize 256x256 icon.iconset/icon_128x128@2x.png
magick "$SOURCE" -resize 256x256 icon.iconset/icon_256x256.png
magick "$SOURCE" -resize 512x512 icon.iconset/icon_256x256@2x.png
magick "$SOURCE" -resize 512x512 icon.iconset/icon_512x512.png
magick "$SOURCE" -resize 1024x1024 icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset

# Windows .ico
magick "$SOURCE" -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```
