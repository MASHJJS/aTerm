import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ProjectConfig } from "../lib/config";
import type { GitStatus } from "../lib/git";
import type { Task } from "../lib/tasks";

interface StatusBarProps {
  selectedProject: ProjectConfig | null;
  selectedTask?: Task | null;
  onOpenGitPane?: () => void;
}

export const STATUS_BAR_HEIGHT = 24;

export function StatusBar({
  selectedProject,
  selectedTask,
  onOpenGitPane,
}: StatusBarProps) {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const activePath = selectedTask?.worktreePath || selectedProject?.path || null;
  const displayName =
    selectedProject && selectedTask
      ? `${selectedProject.name} / ${selectedTask.name}`
      : selectedProject?.name || null;
  const canOpenGitPane = !!onOpenGitPane && !!gitStatus;

  const handleOpenGitPane = () => {
    if (!canOpenGitPane) return;
    onOpenGitPane?.();
  };

  useEffect(() => {
    if (!activePath) {
      setGitStatus(null);
      return;
    }

    let mounted = true;

    async function fetchGitStatus() {
      if (!activePath) return;

      setLoading(true);
      try {
        const status = await invoke<GitStatus>("get_git_status", {
          path: activePath,
        });
        if (mounted) {
          setGitStatus(status);
        }
      } catch (e) {
        // Not a git repo or error - clear status
        if (mounted) {
          setGitStatus(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchGitStatus();

    // Poll every 5 seconds for updates
    const interval = setInterval(fetchGitStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activePath]);

  const dirtyCount = gitStatus
    ? gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        {displayName && <span style={styles.projectName}>{displayName}</span>}
      </div>
      <div
        style={{
          ...styles.right,
          ...(canOpenGitPane ? styles.rightClickable : null),
        }}
        onClick={handleOpenGitPane}
        onKeyDown={(e) => {
          if (!canOpenGitPane) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenGitPane?.();
          }
        }}
        role={canOpenGitPane ? "button" : undefined}
        tabIndex={canOpenGitPane ? 0 : undefined}
        aria-label={canOpenGitPane ? "Open Git Panel" : undefined}
        title={canOpenGitPane ? "Open Git Panel" : undefined}
      >
        {activePath && gitStatus && (
          <>
            {/* Branch name */}
            <div style={styles.item}>
              <span style={styles.branchIcon}>⎇</span>
              <span style={styles.branchName}>{gitStatus.branch || "detached"}</span>
            </div>

            {/* Ahead/behind indicators */}
            {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
              <div style={styles.item}>
                {gitStatus.ahead > 0 && (
                  <span style={styles.ahead}>↑{gitStatus.ahead}</span>
                )}
                {gitStatus.behind > 0 && (
                  <span style={styles.behind}>↓{gitStatus.behind}</span>
                )}
              </div>
            )}

            {/* Dirty indicator */}
            {dirtyCount > 0 && (
              <div style={styles.item}>
                <span style={styles.dirty}>●</span>
                <span style={styles.dirtyCount}>{dirtyCount}</span>
              </div>
            )}
          </>
        )}
        {activePath && loading && !gitStatus && (
          <span style={styles.loading}>...</span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: STATUS_BAR_HEIGHT,
    minHeight: STATUS_BAR_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    backgroundColor: "var(--bg-darker, #1a1a1a)",
    borderTop: "1px solid var(--border)",
    fontSize: "12px",
    color: "var(--text-muted)",
    userSelect: "none",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  rightClickable: {
    cursor: "pointer",
  },
  projectName: {
    color: "var(--text-muted)",
    opacity: 0.7,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  branchIcon: {
    fontSize: "11px",
    opacity: 0.7,
  },
  branchName: {
    color: "var(--text)",
    fontWeight: 500,
  },
  ahead: {
    color: "#98c379", // green
  },
  behind: {
    color: "#e5c07b", // yellow
    marginLeft: "4px",
  },
  dirty: {
    color: "#e5c07b", // yellow
    fontSize: "10px",
  },
  dirtyCount: {
    color: "var(--text-muted)",
  },
  loading: {
    opacity: 0.5,
  },
};
