# Plan: Split themes.ts into Separate Files

## Current State
- `src/lib/themes.ts` is 581 lines
- Contains 1 interface, 11 theme definitions (~50 lines each), and helper functions

## Target Structure

```
src/lib/themes/
├── types.ts                    # Theme interface (~60 lines)
├── index.ts                    # Exports, DEFAULT_THEME, getTheme(), getThemeList() (~30 lines)
└── definitions/
    ├── midnight.ts             # ~50 lines
    ├── dracula.ts              # ~50 lines
    ├── nord.ts                 # ~50 lines
    ├── tokyo-night.ts          # ~50 lines
    ├── gruvbox.ts              # ~50 lines
    ├── one-dark.ts             # ~50 lines
    ├── catppuccin.ts           # ~50 lines
    ├── monokai.ts              # ~50 lines
    ├── solarized.ts            # ~50 lines
    ├── rose-pine.ts            # ~50 lines
    └── index.ts                # Re-exports all themes (~15 lines)
```

## Implementation Steps

1. **Create folder structure**
   ```bash
   mkdir -p src/lib/themes/definitions
   ```

2. **Create `src/lib/themes/types.ts`**
   - Move `Theme` interface

3. **Create individual theme files** in `definitions/`
   - Each file exports a single theme object
   - Import `Theme` type from `../types`
   - Example: `export const midnight: Theme = { ... }`

4. **Create `src/lib/themes/definitions/index.ts`**
   - Re-export all themes
   - Export combined `themes` Record

5. **Create `src/lib/themes/index.ts`**
   - Re-export `Theme` type from `./types`
   - Re-export `themes` from `./definitions`
   - Export `DEFAULT_THEME`, `getTheme()`, `getThemeList()`

6. **Delete old `src/lib/themes.ts`**

7. **Update imports** in consuming files:
   - `src/context/ThemeContext.tsx`
   - `src/components/settings/AppearanceTab.tsx`
   - Any other files importing from `../lib/themes`

## Validation

- Run `npx tsc --noEmit` to verify no type errors
- Test theme switching in the app
- Verify all 11 themes appear in settings

## Notes

- Keep filenames kebab-case (e.g., `tokyo-night.ts` not `tokyoNight.ts`)
- Theme IDs in code remain camelCase (e.g., `tokyoNight`)
- This is a pure refactor - no functionality changes
