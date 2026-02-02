import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-modal"
      onClick={handleClose}
    >
      <div
        className="w-[90%] max-w-[1000px] h-[85%] bg-background rounded-xl border border-border flex flex-col overflow-hidden shadow-2xl animate-popover-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-secondary border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-foreground font-mono">{fileName}</span>
            {hasChanges && (
              <span className="text-[11px] text-yellow-500 px-1.5 py-0.5 bg-yellow-500/15 rounded">
                Modified
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              className={cn(
                "bg-orange-500 hover:bg-orange-600 text-white",
                !hasChanges && "opacity-50 cursor-not-allowed"
              )}
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save (⌘S)"}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleClose}
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              Loading...
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center text-destructive text-xs">
              {error}
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <div className="py-3 bg-secondary border-r border-border select-none overflow-hidden">
                {content.split("\n").map((_, i) => (
                  <div
                    key={i}
                    className="px-3 font-mono text-xs leading-relaxed text-muted-foreground text-right"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                className="flex-1 p-3 bg-background border-none outline-none text-foreground text-xs font-mono leading-relaxed resize-none overflow-auto"
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
