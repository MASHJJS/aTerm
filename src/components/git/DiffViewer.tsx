import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Pencil } from "lucide-react";

type ViewMode = "diff" | "edit";

interface Props {
  diff: string;
  fileName?: string;
  viewMode?: ViewMode;
  onToggleEdit?: () => void;
}

interface DiffLine {
  type: "header" | "hunk" | "added" | "removed" | "context" | "info";
  content: string;
  lineNumber?: { old?: number; new?: number };
}

export function DiffViewer({ diff, fileName, viewMode, onToggleEdit }: Props) {
  const lines = useMemo(() => parseDiff(diff), [diff]);

  if (!diff) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <span className="text-xs">Select a file to view diff</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {fileName && (
        <div className="px-3 py-1.5 flex items-center justify-between bg-secondary border-b border-border">
          <span className="text-[11px] font-medium text-foreground truncate">{fileName}</span>
          {onToggleEdit && (
            <div className="flex items-center gap-0.5 ml-2 shrink-0">
              <Button
                variant={viewMode === "diff" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={undefined}
                className={cn(
                  "h-6 w-6",
                  viewMode === "diff" && "bg-accent text-foreground"
                )}
                title="Diff view"
              >
                <FileText className="h-3 w-3" />
              </Button>
              <Button
                variant={viewMode === "edit" ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={onToggleEdit}
                className={cn(
                  "h-6 w-6",
                  viewMode === "edit" && "bg-accent text-foreground"
                )}
                title="Edit file"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto font-mono text-xs leading-relaxed">
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "flex min-h-[18px] whitespace-pre",
              line.type === "added" && "bg-green-500/15 text-green-400",
              line.type === "removed" && "bg-red-500/15 text-red-400",
              line.type === "hunk" && "bg-blue-500/10 text-blue-400",
              line.type === "header" && "text-muted-foreground italic",
              line.type === "info" && "text-blue-400"
            )}
          >
            {line.lineNumber && (
              <span className="flex shrink-0 select-none border-r border-border">
                <span className="w-10 px-2 text-right text-muted-foreground text-[11px]">
                  {line.lineNumber.old ?? ""}
                </span>
                <span className="w-10 px-2 text-right text-muted-foreground text-[11px]">
                  {line.lineNumber.new ?? ""}
                </span>
              </span>
            )}
            <span className="flex-1 px-3 overflow-hidden text-ellipsis">{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function parseDiff(diff: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("diff --git") || rawLine.startsWith("index ") ||
        rawLine.startsWith("---") || rawLine.startsWith("+++")) {
      lines.push({ type: "header", content: rawLine });
    } else if (rawLine.startsWith("@@")) {
      const match = rawLine.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      lines.push({ type: "hunk", content: rawLine });
    } else if (rawLine.startsWith("+")) {
      lines.push({
        type: "added",
        content: rawLine.slice(1),
        lineNumber: { new: newLine++ },
      });
    } else if (rawLine.startsWith("-")) {
      lines.push({
        type: "removed",
        content: rawLine.slice(1),
        lineNumber: { old: oldLine++ },
      });
    } else if (rawLine.startsWith(" ")) {
      lines.push({
        type: "context",
        content: rawLine.slice(1),
        lineNumber: { old: oldLine++, new: newLine++ },
      });
    } else if (rawLine.startsWith("New file:") || rawLine.startsWith("Binary")) {
      lines.push({ type: "info", content: rawLine });
    } else if (rawLine.trim()) {
      lines.push({ type: "context", content: rawLine });
    }
  }

  return lines;
}
