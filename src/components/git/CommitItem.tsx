import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CommitSummary, CommitFile } from "../../lib/git";

interface Props {
  commit: CommitSummary;
  isSelected: boolean;
  files: CommitFile[] | null;
  selectedFile: string | null;
  onSelect: () => void;
  onSelectFile: (file: string) => void;
  isLoading: boolean;
}

export function CommitItem({
  commit,
  isSelected,
  files,
  selectedFile,
  onSelect,
  onSelectFile,
  isLoading,
}: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="border-b border-border">
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 cursor-pointer gap-3",
          isSelected ? "bg-muted" : hovered ? "bg-secondary" : "bg-transparent"
        )}
        onClick={onSelect}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <span className="font-mono text-[11px] text-blue-400 shrink-0">{commit.shortHash}</span>
          <span className="text-xs text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
            {commit.subject}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground">{commit.relativeTime}</span>
          {commit.filesChanged > 0 && (
            <span className="flex gap-1.5 font-mono text-[10px]">
              <span className="text-green-400">+{commit.additions}</span>
              <span className="text-red-400">-{commit.deletions}</span>
            </span>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 py-2 border-b border-border mb-2">
            <span className="text-[11px] text-muted-foreground">{commit.author}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">{commit.hash}</span>
          </div>

          {isLoading ? (
            <div className="py-2 text-[11px] text-muted-foreground">Loading files...</div>
          ) : files && files.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {files.map((file) => (
                <div
                  key={file.path}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1 rounded cursor-pointer",
                    selectedFile === file.path ? "bg-background" : "bg-transparent hover:bg-secondary"
                  )}
                  onClick={() => onSelectFile(file.path)}
                >
                  <span
                    className="font-mono text-[10px] font-semibold w-3"
                    style={{ color: getStatusColor(file.status) }}
                  >
                    {getStatusIcon(file.status)}
                  </span>
                  <span className="text-[11px] text-foreground flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {file.path}
                  </span>
                  <span className="flex gap-1.5 font-mono text-[10px]">
                    {file.additions > 0 && <span className="text-green-400">+{file.additions}</span>}
                    {file.deletions > 0 && <span className="text-red-400">-{file.deletions}</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-[11px] text-muted-foreground">No files changed</div>
          )}
        </div>
      )}
    </div>
  );
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "added": return "A";
    case "modified": return "M";
    case "deleted": return "D";
    case "renamed": return "R";
    default: return "?";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "added": return "#98c379";
    case "modified": return "#e2c08d";
    case "deleted": return "#e06c75";
    case "renamed": return "#61afef";
    default: return "var(--text-muted)";
  }
}
