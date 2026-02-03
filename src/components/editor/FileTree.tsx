import { FileTreeNode } from "./FileTreeNode";
import type { FileNode } from "../../lib/editor";

interface Props {
  nodes: FileNode[];
  selectedPath: string | null;
  isExpanded: (path: string) => boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  depth?: number;
}

export function FileTree({
  nodes,
  selectedPath,
  isExpanded,
  onToggle,
  onSelect,
  depth = 0,
}: Props) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.path}>
          <FileTreeNode
            node={node}
            depth={depth}
            isExpanded={node.isDir && isExpanded(node.path)}
            isSelected={selectedPath === node.path}
            onToggle={() => onToggle(node.path)}
            onSelect={() => onSelect(node.path)}
          />
          {node.isDir && isExpanded(node.path) && node.children && (
            <FileTree
              nodes={node.children}
              selectedPath={selectedPath}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </>
  );
}
