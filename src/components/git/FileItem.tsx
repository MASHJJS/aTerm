import { useState } from "react";
import { cn } from "@/lib/utils";
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
        className={cn(
          "flex items-center py-1 px-2 pl-4 cursor-pointer rounded mx-1 min-h-[24px] gap-2",
          isSelected ? "bg-muted" : hovered ? "bg-secondary" : "bg-transparent"
        )}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="font-mono text-[11px] font-semibold w-3.5 shrink-0" style={{ color: statusColor }}>
          {statusIcon}
        </span>
        <span className="text-xs text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
          {fileName}
        </span>
        {dirPath && (
          <span className="text-[11px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap flex-1">
            {dirPath}
          </span>
        )}

        {(hovered || isSelected) && (
          <div className="flex gap-1 ml-auto shrink-0">
            {onViewInModal && (
              <button
                className="w-5 h-5 flex items-center justify-center bg-muted border border-border rounded text-foreground text-sm font-semibold cursor-pointer opacity-80 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onViewInModal(); }}
                title="View diff in popup"
              >
                ⤢
              </button>
            )}
            {file.staged && onUnstage && (
              <button
                className="w-5 h-5 flex items-center justify-center bg-muted border border-border rounded text-foreground text-sm font-semibold cursor-pointer opacity-80 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onUnstage(); }}
                title="Unstage"
              >
                -
              </button>
            )}
            {!file.staged && onStage && (
              <button
                className="w-5 h-5 flex items-center justify-center bg-muted border border-border rounded text-foreground text-sm font-semibold cursor-pointer opacity-80 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onStage(); }}
                title="Stage"
              >
                +
              </button>
            )}
            {!file.staged && onDiscard && (
              <button
                className="w-5 h-5 flex items-center justify-center bg-muted border border-border rounded text-destructive text-sm font-semibold cursor-pointer opacity-80 hover:opacity-100"
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
          <div className="fixed inset-0 z-popover" onClick={closeContextMenu} />
          <div
            className="fixed bg-popover border border-border rounded-lg shadow-lg z-modal min-w-[180px] p-1 overflow-hidden animate-popover-in"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            {onViewInModal && (
              <button
                className="w-full flex items-center px-3 py-2 bg-transparent border-none text-foreground text-xs cursor-pointer rounded text-left hover:bg-accent"
                onClick={() => { closeContextMenu(); onViewInModal(); }}
              >
                View Diff in Popup
              </button>
            )}
            {onEdit && (
              <button
                className="w-full flex items-center px-3 py-2 bg-transparent border-none text-foreground text-xs cursor-pointer rounded text-left hover:bg-accent"
                onClick={() => { closeContextMenu(); onEdit(); }}
              >
                Edit File
              </button>
            )}
            {onOpenInEditor && (
              <>
                <div className="h-px bg-border my-1" />
                <button
                  className="w-full flex items-center px-3 py-2 bg-transparent border-none text-foreground text-xs cursor-pointer rounded text-left hover:bg-accent"
                  onClick={() => { closeContextMenu(); onOpenInEditor("vscode"); }}
                >
                  Open in VSCode
                </button>
                <button
                  className="w-full flex items-center px-3 py-2 bg-transparent border-none text-foreground text-xs cursor-pointer rounded text-left hover:bg-accent"
                  onClick={() => { closeContextMenu(); onOpenInEditor("cursor"); }}
                >
                  Open in Cursor
                </button>
                <button
                  className="w-full flex items-center px-3 py-2 bg-transparent border-none text-foreground text-xs cursor-pointer rounded text-left hover:bg-accent"
                  onClick={() => { closeContextMenu(); onOpenInEditor("default"); }}
                >
                  Open in Default Editor
                </button>
              </>
            )}
            {(onStage || onUnstage || onDiscard) && <div className="h-px bg-border my-1" />}
            {file.staged && onUnstage && (
              <button
                className="w-full flex items-center px-3 py-2 bg-transparent border-none text-foreground text-xs cursor-pointer rounded text-left hover:bg-accent"
                onClick={() => { closeContextMenu(); onUnstage(); }}
              >
                Unstage
              </button>
            )}
            {!file.staged && onStage && (
              <button
                className="w-full flex items-center px-3 py-2 bg-transparent border-none text-foreground text-xs cursor-pointer rounded text-left hover:bg-accent"
                onClick={() => { closeContextMenu(); onStage(); }}
              >
                Stage
              </button>
            )}
            {!file.staged && onDiscard && (
              <button
                className="w-full flex items-center px-3 py-2 bg-transparent border-none text-destructive text-xs cursor-pointer rounded text-left hover:bg-accent"
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
