import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  filePath: string;
  onClose: () => void;
  onSave: () => void;
}

export function FileEditor({ filePath, onClose, onSave }: Props) {
  const [content, setContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasChanges = content !== originalContent;
  const fileName = filePath.split("/").pop() || filePath;

  useEffect(() => {
    loadFile();
  }, [filePath]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
      if (e.metaKey && e.key === "s") {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasChanges, content]);

  async function loadFile() {
    setIsLoading(true);
    setError(null);
    try {
      const fileContent = await invoke<string>("read_file_content", { path: filePath });
      setContent(fileContent);
      setOriginalContent(fileContent);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await invoke("write_file_content", { path: filePath, content });
      setOriginalContent(content);
      onSave();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  }

  function handleClose() {
    if (hasChanges) {
      if (!window.confirm("You have unsaved changes. Discard them?")) {
        return;
      }
    }
    onClose();
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <span style={styles.fileName}>{fileName}</span>
            {hasChanges && <span style={styles.modified}>Modified</span>}
          </div>
          <div style={styles.actions}>
            <button
              style={{
                ...styles.saveButton,
                ...(hasChanges ? {} : styles.buttonDisabled),
              }}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save (⌘S)"}
            </button>
            <button style={styles.closeButton} onClick={handleClose} title="Close (Esc)">
              ×
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loading}>Loading...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : (
            <div style={styles.editorContainer}>
              <div style={styles.lineNumbers}>
                {content.split("\n").map((_, i) => (
                  <div key={i} style={styles.lineNumber}>
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                style={styles.textarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}
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
    maxWidth: "1000px",
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
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  fileName: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text)",
    fontFamily: "var(--font-mono, 'SF Mono', Menlo, monospace)",
  },
  modified: {
    fontSize: "11px",
    color: "#e2c08d",
    padding: "2px 6px",
    backgroundColor: "rgba(226, 192, 141, 0.15)",
    borderRadius: "4px",
  },
  actions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  saveButton: {
    padding: "6px 12px",
    backgroundColor: "#f97316",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
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
  },
  content: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
  },
  loading: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    fontSize: "12px",
  },
  error: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#e06c75",
    fontSize: "12px",
  },
  editorContainer: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  lineNumbers: {
    padding: "12px 0",
    backgroundColor: "var(--bg-secondary)",
    borderRight: "1px solid var(--border-subtle)",
    userSelect: "none",
    overflow: "hidden",
  },
  lineNumber: {
    padding: "0 12px",
    fontSize: "12px",
    fontFamily: "var(--font-mono, 'SF Mono', Menlo, monospace)",
    lineHeight: "1.5",
    color: "var(--text-subtle)",
    textAlign: "right",
  },
  textarea: {
    flex: 1,
    padding: "12px",
    backgroundColor: "var(--bg)",
    border: "none",
    outline: "none",
    color: "var(--text)",
    fontSize: "12px",
    fontFamily: "var(--font-mono, 'SF Mono', Menlo, monospace)",
    lineHeight: "1.5",
    resize: "none",
    overflow: "auto",
  },
};
