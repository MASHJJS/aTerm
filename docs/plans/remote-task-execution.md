# Remote Task Execution Feature

Execute tasks on remote servers via SSH, with the git worktree running in a tmux session on the remote.

## Data Model Changes

### 1. New Type: `SSHConnection` (`src/lib/ssh.ts`)

```typescript
interface SSHConnection {
  id: string;
  name: string;           // User-friendly name (e.g., "Home Server")
  host: string;           // Hostname or IP
  port: number;           // Default: 22
  user: string;           // SSH username
  keyPath?: string;       // Optional private key path (uses ssh-agent if not set)
}
```

### 2. AppConfig additions (`src/lib/config.ts`)

```typescript
interface AppConfig {
  // ... existing ...
  sshConnections?: SSHConnection[];
}
```

### 3. ProjectConfig additions (`src/lib/config.ts`)

```typescript
interface ProjectConfig {
  // ... existing ...
  sshConnectionId?: string;       // References SSHConnection.id
  remoteProjectPath?: string;     // Path on remote (e.g., /home/user/dev/myproject)
}
```

### 4. Task additions (`src/lib/tasks.ts`)

```typescript
interface Task {
  // ... existing ...
  isRemote?: boolean;             // If true, runs on remote server
  remoteTmuxSession?: string;     // tmux session name on remote
}
```

---

## UI Changes

### 1. SettingsModal - New "SSH" Tab

**File:** `src/components/SettingsModal.tsx`

Add fourth tab "SSH" with:
- List of existing SSH connections (name, host, user)
- "Add Connection" button → inline form or sub-modal
- Edit/Delete actions per connection
- "Test Connection" button

### 2. AddProjectModal - Remote Configuration Section

**File:** `src/components/AddProjectModal.tsx`

After provider/layout selection, add collapsible "Remote Execution" section:
- Dropdown: "SSH Connection" (None, existing connections, or "+ New Connection")
- Selecting "+ New Connection" shows inline form to create new SSH connection
- Text input: "Remote Project Path" (only enabled if connection selected)
- **Validates remote path exists via SSH before allowing save**
- Shows validation status (checking... / valid / invalid)

### 3. CreateTaskModal - "Remote?" Checkbox

**File:** `src/components/CreateTaskModal.tsx`

Add checkbox (only visible when project has SSH configured):
```tsx
{project.sshConnectionId && (
  <label className="flex items-center gap-2">
    <Checkbox checked={isRemote} onCheckedChange={setIsRemote} />
    <span>Run on remote server</span>
  </label>
)}
```

### 4. ProjectSidebar - Visual Indicator

**File:** `src/components/ProjectSidebar.tsx`

Show cloud/server icon next to projects with `sshConnectionId` set.

---

## Backend Changes (Rust)

### 1. New Module: `src-tauri/src/ssh.rs`

```rust
#[tauri::command]
pub fn test_ssh_connection(
    host: String,
    port: u16,
    user: String,
    key_path: Option<String>,
) -> Result<bool, String>

#[tauri::command]
pub fn remote_command(
    host: String,
    port: u16,
    user: String,
    key_path: Option<String>,
    command: String,
) -> Result<String, String>

#[tauri::command]
pub fn remote_path_exists(
    host: String,
    port: u16,
    user: String,
    key_path: Option<String>,
    path: String,
) -> Result<bool, String>
```

Implementation: Shell out to system `ssh` command (simpler than ssh2 crate, uses existing ssh-agent).

### 2. Remote Worktree Commands

**File:** `src-tauri/src/worktree.rs`

```rust
#[tauri::command]
pub fn create_remote_worktree(
    ssh_host: String,
    ssh_port: u16,
    ssh_user: String,
    ssh_key_path: Option<String>,
    remote_project_path: String,
    task_name: String,
    base_ref: Option<String>,
) -> Result<WorktreeInfo, String>

#[tauri::command]
pub fn remove_remote_worktree(
    ssh_host: String,
    ssh_port: u16,
    ssh_user: String,
    ssh_key_path: Option<String>,
    worktree_path: String,
) -> Result<(), String>
```

### 3. Remote PTY Spawning

**File:** `src-tauri/src/pty.rs`

For remote tasks, spawn SSH that attaches to tmux:
```bash
ssh -t user@host -p port "tmux new-session -A -s {session_name} -c {worktree_path}"
```

The `-A` flag creates or attaches to existing session, enabling reconnection.

---

## Execution Flow

### Local Task (Existing)
1. Create git worktree locally
2. Spawn PTY with `cd {worktreePath} && {provider_command}`

### Remote Task (New)
1. SSH to remote, create worktree via `create_remote_worktree`
2. Start tmux session on remote with provider command
3. Local PTY runs: `ssh -t host "tmux new-session -A -s {session} -c {path}"`
4. **Auto-reattach**: The `-A` flag means opening the task always reattaches to existing session
5. User can close aTerm, reopen task → automatically reconnects to same tmux session

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/ssh.ts` | Create | SSHConnection type + helpers |
| `src/lib/config.ts` | Modify | Add sshConnections to AppConfig |
| `src/lib/tasks.ts` | Modify | Add isRemote, remoteTmuxSession |
| `src/components/SettingsModal.tsx` | Modify | Add SSH tab |
| `src/components/settings/SSHConnectionsTab.tsx` | Create | SSH management UI |
| `src/components/AddProjectModal.tsx` | Modify | Add remote config section |
| `src/components/CreateTaskModal.tsx` | Modify | Add Remote checkbox |
| `src/components/ProjectSidebar.tsx` | Modify | Add remote indicator |
| `src-tauri/src/ssh.rs` | Create | SSH commands |
| `src-tauri/src/worktree.rs` | Modify | Add remote worktree functions |
| `src-tauri/src/pty.rs` | Modify | Handle remote PTY spawning |
| `src-tauri/src/lib.rs` | Modify | Register new commands |

---

## Implementation Order

1. **Data model** - Add types to `ssh.ts`, `config.ts`, `tasks.ts`
2. **Rust SSH module** - Create `ssh.rs` with test/command functions
3. **Settings SSH tab** - UI for managing SSH connections
4. **AddProjectModal** - Remote configuration section
5. **Remote worktree** - Backend for creating worktrees on remote
6. **CreateTaskModal** - Add Remote checkbox + logic
7. **Remote PTY** - Spawn SSH+tmux for remote tasks

---

## Verification

1. **SSH Connection Management**
   - Add SSH connection in Settings → SSH tab
   - Test connection works
   - Edit/delete connection

2. **Project Remote Configuration**
   - Add new project, configure SSH connection + remote path
   - Verify remote path validation works

3. **Remote Task Execution**
   - Create task with "Remote?" checked
   - Verify worktree created on remote
   - Verify terminal attaches to remote tmux session
   - Close terminal, reopen → should reattach to same session
