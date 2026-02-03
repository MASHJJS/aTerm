import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ManagedFile } from "../../lib/editor";
import { getFileIcon } from "../../lib/fileIcons";

interface Props {
  files: ManagedFile[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
}

export function EditorTabs({ files, activeFilePath, onSelectFile, onCloseFile }: Props) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-0 bg-secondary border-b border-border overflow-x-auto shrink-0">
      {files.map((file) => {
        const fileName = file.path.split("/").pop() || file.path;
        const icon = getFileIcon(fileName, false);
        const isActive = file.path === activeFilePath;

        return (
          <div
            key={file.path}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs border-r border-border hover:bg-accent/50 group min-w-0",
              isActive && "bg-background"
            )}
            onClick={() => onSelectFile(file.path)}
            title={file.path}
          >
            <span
              className="shrink-0 text-[9px] font-bold"
              style={{ color: icon.color }}
            >
              {icon.icon}
            </span>
            <span className="truncate max-w-[120px]">{fileName}</span>
            {file.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
            )}
            <button
              className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 -mr-1 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file.path);
              }}
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
