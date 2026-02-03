import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FileNode } from "../lib/editor";

interface ProjectFileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

export function useFileExplorer(projectRoot: string) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load root directory
  const loadRoot = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const entries = await invoke<ProjectFileEntry[]>("list_project_directory", {
        root: projectRoot,
        relativePath: null,
      });

      const nodes: FileNode[] = entries.map((entry) => ({
        name: entry.name,
        path: entry.path,
        isDir: entry.isDir,
        isLoaded: !entry.isDir, // Files are always "loaded"
        children: entry.isDir ? [] : undefined,
      }));

      setTree(nodes);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [projectRoot]);

  // Load children of a directory
  const loadDirectory = useCallback(
    async (relativePath: string) => {
      try {
        const entries = await invoke<ProjectFileEntry[]>("list_project_directory", {
          root: projectRoot,
          relativePath,
        });

        const children: FileNode[] = entries.map((entry) => ({
          name: entry.name,
          path: entry.path,
          isDir: entry.isDir,
          isLoaded: !entry.isDir,
          children: entry.isDir ? [] : undefined,
        }));

        // Update tree with loaded children
        setTree((prevTree) => updateNodeChildren(prevTree, relativePath, children));
      } catch (err) {
        console.error("Failed to load directory:", err);
      }
    },
    [projectRoot]
  );

  // Toggle directory expansion
  const toggleExpanded = useCallback(
    async (path: string) => {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });

      // Load children if not already loaded
      const node = findNode(tree, path);
      if (node && node.isDir && !node.isLoaded) {
        await loadDirectory(path);
      }
    },
    [tree, loadDirectory]
  );

  // Check if a path is expanded
  const isExpanded = useCallback(
    (path: string) => expandedPaths.has(path),
    [expandedPaths]
  );

  // Refresh entire tree
  const refresh = useCallback(() => {
    setExpandedPaths(new Set());
    loadRoot();
  }, [loadRoot]);

  return {
    tree,
    isLoading,
    error,
    loadRoot,
    toggleExpanded,
    isExpanded,
    refresh,
  };
}

// Helper: Find a node by path
function findNode(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node;
    }
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Update children of a node at given path
function updateNodeChildren(
  nodes: FileNode[],
  targetPath: string,
  children: FileNode[]
): FileNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, children, isLoaded: true };
    }
    if (node.children) {
      return { ...node, children: updateNodeChildren(node.children, targetPath, children) };
    }
    return node;
  });
}
