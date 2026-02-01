import { useEffect } from "react";
import { DiffViewer } from "./DiffViewer";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  diff: string;
  fileName: string;
  onEdit?: () => void;
  onOpenInEditor?: (editor: string) => void;
}

export function DiffModal({ isOpen, onClose, diff, fileName, onEdit, onOpenInEditor }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.fileName}>{fileName}</span>
          <div style={styles.actions}>
            {onEdit && (
              <button style={styles.actionButton} onClick={onEdit} title="Edit file">
                Edit
              </button>
            )}
            {onOpenInEditor && (
              <>
                <button
                  style={styles.actionButton}
                  onClick={() => onOpenInEditor("vscode")}
                  title="Open in VSCode"
                >
                  VSCode
                </button>
                <button
                  style={styles.actionButton}
                  onClick={() => onOpenInEditor("default")}
                  title="Open in default editor"
                >
                  Open
                </button>
              </>
            )}
            <button style={styles.closeButton} onClick={onClose} title="Close (Esc)">
              ×
            </button>
          </div>
        </div>
        <div style={styles.content}>
          <DiffViewer diff={diff} />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    width: "90%",
    maxWidth: "1200px",
    height: "85%",
    backgroundColor: "var(--bg)",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
  },
  header: {
    padding: "12px 16px",
    backgroundColor: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fileName: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text)",
    fontFamily: "var(--font-mono, 'SF Mono', Menlo, monospace)",
  },
  actions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  actionButton: {
    padding: "6px 12px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "6px",
    color: "var(--text)",
    fontSize: "12px",
    cursor: "pointer",
    transition: "background-color 0.1s",
  },
  closeButton: {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    color: "var(--text-muted)",
    fontSize: "20px",
    cursor: "pointer",
    marginLeft: "8px",
  },
  content: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
  },
};
