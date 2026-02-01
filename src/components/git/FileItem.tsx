import { useState } from "react";
import type { GitFile } from "../../lib/git";
import { getStatusIcon, getStatusColor } from "../../lib/git";

interface Props {
  file: GitFile;
  isSelected: boolean;
  onSelect: () => void;
  onStage?: () => void;
  onUnstage?: () => void;
  onDiscard?: () => void;
  onViewInModal?: () => void;
  onEdit?: () => void;
  onOpenInEditor?: (editor: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
}

export function FileItem({
  file,
  isSelected,
  onSelect,
  onStage,
  onUnstage,
  onDiscard,
  onViewInModal,
  onEdit,
  onOpenInEditor,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const statusIcon = getStatusIcon(file.status);
  const statusColor = getStatusColor(file.status);
  const fileName = file.path.split("/").pop() || file.path;
  const dirPath = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : "";

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  return (
    <>
      <div
        style={{
          ...styles.container,
          backgroundColor: isSelected ? "var(--bg-tertiary)" : hovered ? "var(--bg-secondary)" : "transparent",
        }}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span style={{ ...styles.status, color: statusColor }}>{statusIcon}</span>
        <span style={styles.fileName}>{fileName}</span>
        {dirPath && <span style={styles.dirPath}>{dirPath}</span>}

        {(hovered || isSelected) && (
          <div style={styles.actions}>
            {onViewInModal && (
              <button
                style={styles.actionButton}
                onClick={(e) => { e.stopPropagation(); onViewInModal(); }}
                title="View diff in popup"
              >
                ⤢
              </button>
            )}
            {file.staged && onUnstage && (
              <button
                style={styles.actionButton}
                onClick={(e) => { e.stopPropagation(); onUnstage(); }}
                title="Unstage"
              >
                -
              </button>
            )}
            {!file.staged && onStage && (
              <button
                style={styles.actionButton}
                onClick={(e) => { e.stopPropagation(); onStage(); }}
                title="Stage"
              >
                +
              </button>
            )}
            {!file.staged && onDiscard && (
              <button
                style={{ ...styles.actionButton, ...styles.discardButton }}
                onClick={(e) => { e.stopPropagation(); onDiscard(); }}
                title="Discard changes"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      {contextMenu && (
        <>
          <div style={styles.contextOverlay} onClick={closeContextMenu} />
          <div
            style={{
              ...styles.contextMenu,
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            {onViewInModal && (
              <button
                style={styles.contextMenuItem}
                onClick={() => { closeContextMenu(); onViewInModal(); }}
              >
                View Diff in Popup
              </button>
            )}
            {onEdit && (
              <button
                style={styles.contextMenuItem}
                onClick={() => { closeContextMenu(); onEdit(); }}
              >
                Edit File
              </button>
            )}
            {onOpenInEditor && (
              <>
                <div style={styles.contextDivider} />
                <button
                  style={styles.contextMenuItem}
                  onClick={() => { closeContextMenu(); onOpenInEditor("vscode"); }}
                >
                  Open in VSCode
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={() => { closeContextMenu(); onOpenInEditor("cursor"); }}
                >
                  Open in Cursor
                </button>
                <button
                  style={styles.contextMenuItem}
                  onClick={() => { closeContextMenu(); onOpenInEditor("default"); }}
                >
                  Open in Default Editor
                </button>
              </>
            )}
            {(onStage || onUnstage || onDiscard) && <div style={styles.contextDivider} />}
            {file.staged && onUnstage && (
              <button
                style={styles.contextMenuItem}
                onClick={() => { closeContextMenu(); onUnstage(); }}
              >
                Unstage
              </button>
            )}
            {!file.staged && onStage && (
              <button
                style={styles.contextMenuItem}
                onClick={() => { closeContextMenu(); onStage(); }}
              >
                Stage
              </button>
            )}
            {!file.staged && onDiscard && (
              <button
                style={{ ...styles.contextMenuItem, color: "#e06c75" }}
                onClick={() => { closeContextMenu(); onDiscard(); }}
              >
                Discard Changes
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    padding: "4px 8px 4px 16px",
    cursor: "pointer",
    borderRadius: "4px",
    margin: "1px 4px",
    minHeight: "24px",
    gap: "8px",
  },
  status: {
    fontFamily: "var(--font-mono, 'SF Mono', Menlo, monospace)",
    fontSize: "11px",
    fontWeight: 600,
    width: "14px",
    flexShrink: 0,
  },
  fileName: {
    fontSize: "12px",
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dirPath: {
    fontSize: "11px",
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  },
  actions: {
    display: "flex",
    gap: "4px",
    marginLeft: "auto",
    flexShrink: 0,
  },
  actionButton: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "4px",
    color: "var(--text)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    opacity: 0.8,
    transition: "opacity 0.1s",
  },
  discardButton: {
    color: "#e06c75",
  },
  contextOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  contextMenu: {
    position: "fixed",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
    zIndex: 1000,
    minWidth: "180px",
    padding: "4px",
    overflow: "hidden",
  },
  contextMenuItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--text)",
    fontSize: "12px",
    cursor: "pointer",
    borderRadius: "4px",
    textAlign: "left",
  },
  contextDivider: {
    height: "1px",
    backgroundColor: "var(--border-subtle)",
    margin: "4px 0",
  },
};
