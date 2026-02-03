import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileTree } from "./FileTree";
import { useFileExplorer } from "../../hooks/useFileExplorer";

interface Props {
  projectRoot: string;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

export function FileExplorer({ projectRoot, selectedPath, onSelectFile }: Props) {
  const {
    tree,
    isLoading,
    error,
    loadRoot,
    toggleExpanded,
    isExpanded,
    refresh,
  } = useFileExplorer(projectRoot);

  // Load tree on mount
  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  function handleSelect(path: string) {
    // Only select files, not directories
    const node = findNodeByPath(tree, path);
    if (node && !node.isDir) {
      onSelectFile(path);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Explorer
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-destructive text-xs px-2 text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Explorer
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={refresh}
          disabled={isLoading}
          title="Refresh"
          className="h-5 w-5 opacity-60 hover:opacity-100"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {isLoading && tree.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
              Loading...
            </div>
          ) : tree.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
              No files
            </div>
          ) : (
            <FileTree
              nodes={tree}
              selectedPath={selectedPath}
              isExpanded={isExpanded}
              onToggle={toggleExpanded}
              onSelect={handleSelect}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper to find node by path
import type { FileNode } from "../../lib/editor";

function findNodeByPath(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}
