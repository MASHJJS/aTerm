import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import type { FileNode } from "../../lib/editor";
import { getFileIcon } from "../../lib/fileIcons";

interface Props {
  node: FileNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

export function FileTreeNode({
  node,
  depth,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
}: Props) {
  const icon = getFileIcon(node.name, node.isDir);
  const paddingLeft = 8 + depth * 12;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (node.isDir) {
      onToggle();
    } else {
      onSelect();
    }
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!node.isDir) {
      onSelect();
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 py-0.5 px-1 cursor-pointer text-xs hover:bg-accent/50 rounded-sm select-none",
        isSelected && "bg-accent text-accent-foreground"
      )}
      style={{ paddingLeft }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {node.isDir ? (
        <>
          <span className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
          <span className="w-4 h-4 flex items-center justify-center shrink-0" style={{ color: icon.color }}>
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5" />
            ) : (
              <Folder className="w-3.5 h-3.5" />
            )}
          </span>
        </>
      ) : (
        <>
          <span className="w-4 h-4 shrink-0" />
          <span
            className="w-4 h-4 flex items-center justify-center shrink-0 text-[9px] font-bold"
            style={{ color: icon.color }}
          >
            {icon.icon}
          </span>
        </>
      )}
      <span className="truncate">{node.name}</span>
    </div>
  );
}
