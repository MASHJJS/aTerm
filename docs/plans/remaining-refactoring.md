# Remaining Refactoring Opportunities

## Completed Refactoring

| File | Before | After | Status |
|------|--------|-------|--------|
| TerminalLayout.tsx | 1028 | 463 | ✓ Done |
| SettingsModal.tsx | 935 | 252 | ✓ Done |
| TerminalPane.tsx | 690 | 428 | ✓ Done |
| AddProjectModal.tsx | 528 | 277 | ✓ Done |

## Still Above 300-Line Target

### High Priority

#### themes.ts (581 lines)
- See `split-themes.md` for detailed plan
- Split into `src/lib/themes/` folder with individual theme files

### Medium Priority

#### TerminalLayout.tsx (463 lines)
Already refactored once. Further splits possible:
- Extract context menu logic into `useContextMenu` hook
- Extract keyboard navigation into `useKeyboardNavigation` hook

#### App.tsx (452 lines)
Root component with many handlers. Could extract:
- `useProjectHandlers` - project CRUD operations
- `useLayoutHandlers` - layout management
- `useConfigPersistence` - config load/save logic

#### TerminalPane.tsx (428 lines)
Already refactored once. Further splits possible:
- Extract keyboard handler logic
- Extract PTY communication into custom hook

### Low Priority (Close to Target)

| File | Lines | Notes |
|------|-------|-------|
| LayoutsTab.tsx | 338 | Acceptable |
| ProfilesTab.tsx | 333 | Acceptable |
| SortablePane.tsx | 331 | Acceptable |
| GitPane.tsx | 329 | Acceptable |
| ProjectSidebar.tsx | 291 | Under target |

## Design System Components Created

- `at-section-header.tsx` - Section headers with optional actions
- `at-form-field.tsx` - Form fields with labels and hints
- `at-list-item.tsx` - List items with consistent styling
- `at-color-dot.tsx` - Color indicators for profiles/panes

## Folder Structure Pattern

When splitting a component, create a folder with the same name:
```
component.tsx (large file)
↓
component/
├── index.ts           # Re-exports
├── types.ts           # Interfaces and types
├── SubComponent1.tsx  # Extracted component
├── SubComponent2.tsx  # Extracted component
└── hooks.ts           # Extracted hooks (if any)
```

Then update the original file to import from the folder.
