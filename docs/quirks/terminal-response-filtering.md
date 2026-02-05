# Terminal Response Filtering

## The Problem

xterm.js responds to terminal queries (DA, CPR, OSC) via its `onData` callback — the same path as user keystrokes. In a native terminal like iTerm2, these responses travel in-process in microseconds. In aTerm, they cross two IPC boundaries:

```
PTY query → Rust read → base64 → Tauri event → JS → xterm.js processes it
xterm.js response → onData → Tauri invoke → Rust → PTY write
```

This round-trip adds enough latency that **shell-initiated queries** (e.g., zsh querying background color on startup) get their responses back after the shell has moved on, causing them to echo as visible garbage like `^[[?62;c` or `^[]11;rgb:...`.

## The Wrong Fix

Filtering all terminal responses in `onData` before writing to the PTY:

```javascript
// DON'T DO THIS
terminal.onData((data) => {
  const filtered = data
    .replace(/\x1b\]\d+;[^\x07\x1b]*(?:\x1b\\|\x07)/g, "")  // OSC
    .replace(/\x1b\[\d+;\d+R/g, "")                            // CPR
    .replace(/\x1b\[\?[\d;]*c/g, "");                          // DA
  invoke("write_pty", { id, data: filtered });
});
```

This breaks any CLI that **actively waits** for these responses. Notably:
- **charmbracelet/lipgloss** (used by supabase CLI, charm tools, etc.) sends DA queries to detect terminal capabilities and blocks until a response arrives. Filtering the response causes a multi-second timeout on every command.
- **OSC 11** background color queries are used by lipgloss to detect dark/light mode.

## Current Approach

No filtering. All xterm.js responses pass through to the PTY unmodified:

```javascript
terminal.onData((data) => {
  invoke("write_pty", { id, data }).catch(console.error);
});
```

## If Garbage Reappears

If shell startup garbage becomes a problem again, use a **time-windowed filter** that only suppresses responses during the first ~500ms after PTY spawn, then lets everything through. Never use a blanket filter.
