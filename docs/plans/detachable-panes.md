# Detachable Windows

## Overview

Allow users to "pop out" content into separate windows:
1. **Detachable Panes** - Pop out a single terminal pane into its own window
2. **Detachable Projects** - Pop out an entire project (all its terminals) into its own window

Both features share the same underlying infrastructure (DRY).

## Use Cases

### Detachable Panes
- Focus mode - pop out an AI assistant to work without layout distractions
- Reference terminals - keep a logs terminal visible while working in another project
- Screen sharing - share just one terminal without exposing full workspace

### Detachable Projects
- Multi-monitor workflows - full project on second monitor
- Context switching - keep multiple projects visible simultaneously
- Presentation mode - show project terminals without sidebar

## Architecture

### Window Types

All windows share the same React app, differentiated by URL params:

```
index.html                          → Main window (sidebar + projects)
index.html?mode=pane&id=X           → Detached pane window
index.html?mode=project&id=Y        → Detached project window
```

### Shared Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                      Window Manager (Rust)                       │
│  - create_window(type, config)                                   │
│  - close_window(label)                                           │
│  - list_windows()                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Main Window   │ │  Pane Window    │ │ Project Window  │
│                 │ │                 │ │                 │
│ <App>           │ │ <WindowShell>   │ │ <WindowShell>   │
│  ├─ Sidebar     │ │  └─ PaneView    │ │  └─ ProjectView │
│  └─ ProjectView │ │     └─ Terminal │ │     └─ Layout   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┴───────────────────┘
                              │
                    ┌─────────────────┐
                    │   PTY Manager   │
                    │ (shared across  │
                    │  all windows)   │
                    └─────────────────┘
```

### Key Insight: PTY Events Are Already Global

PTY output uses `app.emit()` which broadcasts to ALL windows. Each window filters by terminal ID using `listen(`pty-output-${id}`)`. No changes needed for PTY routing.

---

## Phase 1: Rust Backend - Window Management

### File: `src-tauri/src/window.rs` (new)

```rust
use tauri::{AppHandle, WebviewWindowBuilder, WebviewUrl};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    pub window_type: String,      // "pane" or "project"
    pub id: String,               // pane_id or project_id
    pub title: String,
    pub width: Option<f64>,
    pub height: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct WindowInfo {
    pub label: String,
    pub window_type: String,
    pub id: String,
}

#[tauri::command]
pub async fn create_detached_window(
    app: AppHandle,
    config: WindowConfig,
) -> Result<String, String> {
    let label = format!("{}-{}", config.window_type, config.id);
    let url = format!(
        "index.html?mode={}&id={}",
        config.window_type,
        config.id
    );

    let window = WebviewWindowBuilder::new(
        &app,
        &label,
        WebviewUrl::App(url.into())
    )
    .title(&config.title)
    .inner_size(
        config.width.unwrap_or(1200.0),
        config.height.unwrap_or(800.0)
    )
    .build()
    .map_err(|e| e.to_string())?;

    Ok(label)
}

#[tauri::command]
pub fn close_detached_window(
    app: AppHandle,
    label: String,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_detached_windows(app: AppHandle) -> Vec<WindowInfo> {
    app.webview_windows()
        .iter()
        .filter_map(|(label, _)| {
            if label == "main" { return None; }
            let parts: Vec<&str> = label.splitn(2, '-').collect();
            if parts.len() == 2 {
                Some(WindowInfo {
                    label: label.clone(),
                    window_type: parts[0].to_string(),
                    id: parts[1].to_string(),
                })
            } else {
                None
            }
        })
        .collect()
}
```

### File: `src-tauri/src/lib.rs` (modify)

```rust
mod window;

// Add to invoke_handler:
.invoke_handler(tauri::generate_handler![
    // ... existing
    window::create_detached_window,
    window::close_detached_window,
    window::list_detached_windows,
])
```

### File: `src-tauri/capabilities/default.json` (modify)

Add permissions:
```json
{
  "permissions": [
    "core:webview:allow-create-webview-window",
    "core:window:allow-close",
    "core:window:allow-set-title",
    "core:window:allow-set-size"
  ]
}
```

---

## Phase 2: Frontend Entry Point Router

### File: `src/main.tsx` (modify)

```typescript
import { App } from "./App";
import { WindowShell } from "./components/WindowShell";
import { DetachedPaneView } from "./components/DetachedPaneView";
import { DetachedProjectView } from "./components/DetachedProjectView";

function getWindowMode(): { mode: string; id: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get("mode") || "main",
    id: params.get("id"),
  };
}

function Root() {
  const { mode, id } = getWindowMode();

  switch (mode) {
    case "pane":
      return (
        <WindowShell title="Terminal">
          <DetachedPaneView paneId={id!} />
        </WindowShell>
      );
    case "project":
      return (
        <WindowShell title="Project">
          <DetachedProjectView projectId={id!} />
        </WindowShell>
      );
    default:
      return <App />;
  }
}

root.render(
  <StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </StrictMode>
);
```

---

## Phase 3: Shared Window Shell Component

### File: `src/components/WindowShell.tsx` (new)

Provides consistent chrome for detached windows:

```typescript
interface WindowShellProps {
  title: string;
  onReattach?: () => void;
  children: React.ReactNode;
}

export function WindowShell({ title, onReattach, children }: WindowShellProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <span className="text-sm font-medium">{title}</span>
        {onReattach && (
          <Button variant="ghost" size="sm" onClick={onReattach}>
            ← Back to Main
          </Button>
        )}
      </header>
      <main className="flex-1 min-h-0">
        {children}
      </main>
    </div>
  );
}
```

---

## Phase 4: Detached Pane View

### File: `src/components/DetachedPaneView.tsx` (new)

```typescript
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TerminalPane } from "./TerminalPane";
import { GitPane } from "./git/GitPane";
import { WindowShell } from "./WindowShell";

interface DetachedPaneConfig {
  paneId: string;
  terminalId: string;
  projectId: string;
  projectPath: string;
  profileId: string;
  profileName: string;
  profileColor: string;
  profileType: "terminal" | "git";
  profileCommand?: string;
}

export function DetachedPaneView({ paneId }: { paneId: string }) {
  const [config, setConfig] = useState<DetachedPaneConfig | null>(null);

  useEffect(() => {
    // Get config from main window via IPC
    listen<DetachedPaneConfig>("pane-config", (event) => {
      if (event.payload.paneId === paneId) {
        setConfig(event.payload);
      }
    });

    // Request config
    invoke("emit_to_main", {
      event: "pane-config-request",
      payload: { paneId }
    });
  }, [paneId]);

  const handleReattach = async () => {
    await invoke("emit_to_main", {
      event: "pane-reattach",
      payload: { paneId }
    });
  };

  if (!config) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const title = `${config.profileName} - ${config.projectPath.split("/").pop()}`;

  return (
    <WindowShell title={title} onReattach={handleReattach}>
      {config.profileType === "git" ? (
        <GitPane
          id={config.terminalId}
          title={config.profileName}
          cwd={config.projectPath}
          accentColor={config.profileColor}
          isFocused={true}
          canClose={false}
        />
      ) : (
        <TerminalPane
          id={config.terminalId}
          title={config.profileName}
          cwd={config.projectPath}
          command={config.profileCommand}
          accentColor={config.profileColor}
          isFocused={true}
          canClose={false}
          isProjectActive={true}
        />
      )}
    </WindowShell>
  );
}
```

---

## Phase 5: Detached Project View

### File: `src/components/DetachedProjectView.tsx` (new)

```typescript
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TerminalLayout } from "./TerminalLayout";
import { WindowShell } from "./WindowShell";
import { useConfig } from "../hooks/useConfig";

export function DetachedProjectView({ projectId }: { projectId: string }) {
  const { config } = useConfig();
  const [project, setProject] = useState(null);
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    // Find project in config
    const proj = config?.projects.find(p => p.id === projectId);
    if (proj) {
      setProject(proj);
      const lay = config?.layouts.find(l => l.id === proj.layoutId);
      setLayout(lay);
    }
  }, [config, projectId]);

  const handleReattach = async () => {
    await invoke("emit_to_main", {
      event: "project-reattach",
      payload: { projectId }
    });
  };

  if (!project || !layout) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <WindowShell
      title={project.name}
      onReattach={handleReattach}
    >
      <TerminalLayout
        project={project}
        layout={layout}
        profiles={config.profiles}
        defaultFontSize={config.defaultFontSize || 13}
        defaultScrollback={config.defaultScrollback || 10000}
        paneFontSizes={{}}
        onPaneFontSizeChange={() => {}}
        onLayoutChange={(newLayout) => setLayout(newLayout)}
        isProjectActive={true}
      />
    </WindowShell>
  );
}
```

---

## Phase 6: State Management Hook

### File: `src/hooks/useDetachedWindows.ts` (new)

```typescript
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";

interface DetachedWindow {
  label: string;
  type: "pane" | "project";
  id: string;
}

export function useDetachedWindows() {
  const [detachedPanes, setDetachedPanes] = useState<Set<string>>(new Set());
  const [detachedProjects, setDetachedProjects] = useState<Set<string>>(new Set());

  // Listen for reattach requests
  useEffect(() => {
    const unlistenPaneReattach = listen("pane-reattach", (event) => {
      const { paneId } = event.payload as { paneId: string };
      reattachPane(paneId);
    });

    const unlistenProjectReattach = listen("project-reattach", (event) => {
      const { projectId } = event.payload as { projectId: string };
      reattachProject(projectId);
    });

    return () => {
      unlistenPaneReattach.then(fn => fn());
      unlistenProjectReattach.then(fn => fn());
    };
  }, []);

  const detachPane = useCallback(async (
    paneId: string,
    terminalId: string,
    project: ProjectConfig,
    profile: TerminalProfile
  ) => {
    const label = await invoke<string>("create_detached_window", {
      config: {
        window_type: "pane",
        id: paneId,
        title: `${profile.name} - ${project.name}`,
        width: 800,
        height: 600,
      }
    });

    setDetachedPanes(prev => new Set(prev).add(paneId));

    // Send config to new window
    setTimeout(() => {
      emit("pane-config", {
        paneId,
        terminalId,
        projectId: project.id,
        projectPath: project.path,
        profileId: profile.id,
        profileName: profile.name,
        profileColor: profile.color,
        profileType: profile.type || "terminal",
        profileCommand: profile.command,
      });
    }, 500);

    return label;
  }, []);

  const detachProject = useCallback(async (project: ProjectConfig) => {
    const label = await invoke<string>("create_detached_window", {
      config: {
        window_type: "project",
        id: project.id,
        title: project.name,
        width: 1200,
        height: 800,
      }
    });

    setDetachedProjects(prev => new Set(prev).add(project.id));
    return label;
  }, []);

  const reattachPane = useCallback(async (paneId: string) => {
    await invoke("close_detached_window", { label: `pane-${paneId}` });
    setDetachedPanes(prev => {
      const next = new Set(prev);
      next.delete(paneId);
      return next;
    });
  }, []);

  const reattachProject = useCallback(async (projectId: string) => {
    await invoke("close_detached_window", { label: `project-${projectId}` });
    setDetachedProjects(prev => {
      const next = new Set(prev);
      next.delete(projectId);
      return next;
    });
  }, []);

  return {
    detachedPanes,
    detachedProjects,
    isPaneDetached: (id: string) => detachedPanes.has(id),
    isProjectDetached: (id: string) => detachedProjects.has(id),
    detachPane,
    detachProject,
    reattachPane,
    reattachProject,
  };
}
```

---

## Phase 7: UI Integration Points

### Pane Context Menu (SortablePane.tsx)

```typescript
<ContextMenuSeparator />
<ContextMenuItem onClick={() => onDetachPane(paneId)}>
  Open in New Window
</ContextMenuItem>
```

### Project Context Menu (ProjectSidebar.tsx)

```typescript
<ContextMenuItem onClick={() => onDetachProject(project)}>
  Open in New Window
</ContextMenuItem>
```

### Keyboard Shortcuts (TerminalLayout.tsx)

```typescript
// Cmd+Shift+O - Open focused pane in new window
if (e.shiftKey && e.metaKey && e.key === "o") {
  e.preventDefault();
  if (focusedPaneId) {
    onDetachPane(focusedPaneId);
  }
}
```

---

## Terminal Instance Preservation

### Critical: Don't Dispose on Detach

The `terminalInstances` Map and `spawnedPtys` Set are already global. When detaching:

1. **Main window**: Hide pane from layout (don't dispose terminal)
2. **Detached window**: Create new TerminalPane component that connects to SAME terminal ID
3. **PTY continues**: Same `pty-output-{id}` events flow to both windows (but only detached shows it)

### File: `src/components/terminal-pane/terminal-instance.ts` (modify)

```typescript
// Add detachment tracking
export const detachedTerminals = new Set<string>();

export function markTerminalDetached(id: string) {
  detachedTerminals.add(id);
}

export function unmarkTerminalDetached(id: string) {
  detachedTerminals.delete(id);
}

export function isTerminalDetached(id: string): boolean {
  return detachedTerminals.has(id);
}
```

---

## IPC Events Summary

| Event | From | To | Payload | Purpose |
|-------|------|------|---------|---------|
| `pane-config-request` | Detached | Main | `{paneId}` | Request pane config |
| `pane-config` | Main | Detached | `DetachedPaneConfig` | Send pane config |
| `pane-reattach` | Detached | Main | `{paneId}` | Request reattach |
| `project-reattach` | Detached | Main | `{projectId}` | Request reattach |
| `window-closed` | System | Main | `{label}` | Handle unexpected close |

---

## MVP Scope

### Phase 1: Detachable Panes
1. Context menu "Open in New Window" on panes
2. Detached pane window with terminal
3. "Back to Main" button to reattach
4. PTY preserved across detach/reattach

### Phase 2: Detachable Projects
1. Context menu "Open in New Window" on projects in sidebar
2. Detached project window with full layout
3. "Back to Main" button to reattach
4. All PTYs preserved

### Skip for MVP
- Keyboard shortcuts
- Window position persistence
- Drag-to-detach gestures
- Multiple panes in one detached window

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `src-tauri/src/window.rs` | New | Window management commands |
| `src-tauri/src/lib.rs` | Modify | Register window commands |
| `src-tauri/capabilities/default.json` | Modify | Window permissions |
| `src/main.tsx` | Modify | Entry point router |
| `src/components/WindowShell.tsx` | New | Shared window chrome |
| `src/components/DetachedPaneView.tsx` | New | Single pane window |
| `src/components/DetachedProjectView.tsx` | New | Full project window |
| `src/hooks/useDetachedWindows.ts` | New | Detachment state |
| `src/components/terminal-pane/terminal-instance.ts` | Modify | Detachment tracking |
| `src/components/terminal-layout/SortablePane.tsx` | Modify | Context menu |
| `src/components/ProjectSidebar.tsx` | Modify | Context menu |

---

## Testing Checklist

- [ ] Detach pane → terminal continues working
- [ ] Reattach pane → returns to original position
- [ ] Detach project → all terminals work
- [ ] Reattach project → returns to sidebar
- [ ] Close detached window via X → state cleaned up
- [ ] Multiple detached windows simultaneously
- [ ] PTY output routed correctly to detached windows
- [ ] Theme applied in detached windows
