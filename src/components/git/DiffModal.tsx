import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-modal"
      onClick={onClose}
    >
      <div
        className="w-[90%] max-w-[1200px] h-[85%] bg-background rounded-xl border border-border flex flex-col overflow-hidden shadow-2xl animate-popover-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-secondary border-b border-border flex justify-between items-center">
          <span className="text-[13px] font-medium text-foreground font-mono">{fileName}</span>
          <div className="flex gap-2 items-center">
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit}>
                Edit
              </Button>
            )}
            {onOpenInEditor && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenInEditor("vscode")}
                >
                  VSCode
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenInEditor("default")}
                >
                  Open
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              title="Close (Esc)"
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex">
          <DiffViewer diff={diff} />
        </div>
      </div>
    </div>
  );
}
