# Plan: Git Worktree Tasks

## Overview

Add the ability to create "tasks" under projects that spin up isolated git worktrees with the coding CLI and an injected prompt. Tasks appear nested under their parent project in the sidebar.

## Data Model

### Task Interface

```typescript
// src/lib/tasks.ts
interface Task {
  id: string;                    // UUID
  projectId: string;             // Parent project ID
  name: string;                  // Display name (e.g., "fix-auth-bug")
  branch: string;                // Git branch name
  worktreePath: string;          // Absolute path to worktree
  initialPrompt?: string;        // Prompt to inject into CLI
  status: 'idle' | 'active';     // Activity status
  createdAt: string;             // ISO timestamp
}
```

### Config Changes

```typescript
// Update src/lib/config.ts
interface ProjectConfig {
  // ... existing fields
  tasks?: Task[];                // Tasks for this project
}
```

---

## Worktree Management

### Rust Backend Commands

Add to `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
fn create_worktree(
    project_path: String,
    task_name: String,
    base_ref: Option<String>,  // defaults to current branch
) -> Result<WorktreeInfo, String>

#[tauri::command]
fn remove_worktree(worktree_path: String) -> Result<(), String>

#[tauri::command]
fn list_worktrees(project_path: String) -> Result<Vec<WorktreeInfo>, String>

struct WorktreeInfo {
    path: String,
    branch: String,
}
```

### Worktree Creation Logic

1. **Slugify task name**: `"Fix Auth Bug"` → `"fix-auth-bug"`
2. **Generate unique suffix**: 3-char hash (e.g., `a7e`)
3. **Branch name**: `aterm/{slug}-{hash}` (e.g., `aterm/fix-auth-bug-a7e`)
4. **Worktree path**: `{project}/../worktrees/{project-name}/{slug}-{hash}`

Example:
```
Project: ~/dev/myapp
Task: "Fix Auth Bug"
→ Branch: aterm/fix-auth-bug-a7e
→ Path: ~/dev/worktrees/myapp/fix-auth-bug-a7e
```

### File Preservation

Copy these files from main project to worktree (if they exist):
- `.env*` (all env files)
- `.envrc`
- `docker-compose.override.yml`

Exclude from copy:
- `node_modules`, `.git`, `vendor`, `dist`, `build`, `.next`, `target`

---

## UI Changes

### Sidebar (ProjectSidebar.tsx)

```
┌─────────────────────────┐
│ ▼ myapp            [⋮]  │  ← Project (click to expand/collapse tasks)
│   ├─ fix-auth-bug  [×]  │  ← Task (indented, with delete button)
│   └─ add-logging   [×]  │
│ ▶ another-project  [⋮]  │  ← Collapsed project
└─────────────────────────┘
```

**Interactions:**
- Click project name → Select project (show layout)
- Click task → Select task (show task terminal)
- Right-click project → Context menu with "Create Task..."
- Click [×] on task → Delete task (with confirmation)

### Create Task Modal

```
┌────────────────────────────────────┐
│ Create Task                        │
├────────────────────────────────────┤
│ Name: [fix-auth-bug____________]   │
│                                    │
│ Base Branch: [main_____________▼]  │
│                                    │
│ Initial Prompt (optional):         │
│ ┌────────────────────────────────┐ │
│ │ Fix the authentication bug     │ │
│ │ in src/auth/login.ts where...  │ │
│ └────────────────────────────────┘ │
│                                    │
│           [Cancel]  [Create Task]  │
└────────────────────────────────────┘
```

### Task View (when task selected)

- Single terminal pane filling the workspace
- Header shows task name and branch
- No layout system (tasks are simple/ephemeral)
- Can add additional terminal panes (not persisted)
- Terminal CWD is the worktree path

---

## Terminal & Prompt Injection

### Task Terminal Initialization

When a task is selected:

1. Check if PTY exists for task
2. If not, spawn new PTY:
   ```typescript
   await invoke("spawn_pty", {
     id: `task-${task.id}`,
     cwd: task.worktreePath,
     cols, rows,
     command: getProviderCommand(project.provider),  // e.g., "claude"
   });
   ```
3. After PTY ready, inject initial prompt:
   ```typescript
   if (task.initialPrompt && !task.promptInjected) {
     await invoke("write_pty", {
       id: `task-${task.id}`,
       data: task.initialPrompt + "\n"
     });
     // Mark as injected to prevent re-injection
   }
   ```

### Provider Command Building

```typescript
function getProviderCommand(provider: ProviderId): string {
  const config = PROVIDERS[provider];
  // e.g., "claude" or "aider --model gpt-4"
  return config.command;
}
```

---

## State Management

### Active Selection

```typescript
// In App.tsx state
const [activeView, setActiveView] = useState<
  | { type: 'project'; projectId: string }
  | { type: 'task'; projectId: string; taskId: string }
>({ type: 'project', projectId: projects[0]?.id });
```

### Task Terminals

Tasks don't use the layout system. Instead, simple terminal array:

```typescript
// Per-task terminal state (in memory, not persisted)
const [taskTerminals, setTaskTerminals] = useState<Map<string, string[]>>();
// Map<taskId, terminalIds[]>
```

---

## Implementation Phases

### Phase 1: Backend (Rust)
- [ ] Add `create_worktree` command
- [ ] Add `remove_worktree` command
- [ ] Add `list_worktrees` command
- [ ] File preservation logic

### Phase 2: Data Model
- [ ] Create `src/lib/tasks.ts` with Task interface
- [ ] Update `ProjectConfig` to include tasks
- [ ] Add task CRUD helpers

### Phase 3: UI - Sidebar
- [ ] Add task list under each project (collapsible)
- [ ] Add right-click context menu on projects
- [ ] Add "Create Task" menu item
- [ ] Add task selection handling
- [ ] Add task delete button

### Phase 4: UI - Create Task Modal
- [ ] Create `CreateTaskModal.tsx`
- [ ] Name input with slug preview
- [ ] Base branch selector
- [ ] Initial prompt textarea
- [ ] Create button triggers worktree creation

### Phase 5: UI - Task View
- [ ] Create `TaskView.tsx` component
- [ ] Single terminal pane
- [ ] Task header with name/branch
- [ ] Ability to add more terminals (ephemeral)

### Phase 6: Terminal Integration
- [ ] Spawn PTY with worktree CWD
- [ ] Inject initial prompt on first launch
- [ ] Track prompt injection state

### Phase 7: Cleanup
- [ ] Delete task removes worktree
- [ ] Handle orphaned worktrees on startup
- [ ] Activity status tracking (optional)

---

## File Changes Summary

### New Files
- `src/lib/tasks.ts` - Task types and helpers
- `src/components/CreateTaskModal.tsx` - Task creation UI
- `src/components/TaskView.tsx` - Task terminal view
- `src-tauri/src/worktree.rs` - Worktree Rust commands

### Modified Files
- `src/lib/config.ts` - Add tasks to ProjectConfig
- `src/components/ProjectSidebar.tsx` - Show nested tasks
- `src/App.tsx` - Handle task selection, add modal state
- `src-tauri/src/lib.rs` - Register new commands

---

## Edge Cases

1. **Project not a git repo** → Disable "Create Task" option
2. **Worktree creation fails** → Show error, don't create task
3. **Dirty working directory** → Warn user before creating worktree
4. **Task terminal closed** → Keep task, respawn terminal on reselect
5. **Project deleted with tasks** → Delete all task worktrees first
6. **Worktree path already exists** → Generate new hash suffix

---

## Future Enhancements

- [ ] Task status indicators (idle/active based on terminal activity)
- [ ] Link tasks to GitHub/Linear issues
- [ ] Multi-agent tasks (multiple providers in parallel)
- [ ] Task conversation history
- [ ] Merge worktree back to main branch
