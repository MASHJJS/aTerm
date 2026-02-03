import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ManagedFile } from "../lib/editor";
import { getLanguageFromPath } from "../lib/editor";

export function useFileManager(projectRoot: string) {
  const [openFiles, setOpenFiles] = useState<ManagedFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);

  // Open a file
  const openFile = useCallback(
    async (relativePath: string) => {
      // Check if already open
      const existing = openFiles.find((f) => f.path === relativePath);
      if (existing) {
        setActiveFilePath(relativePath);
        return;
      }

      // Load file content
      const fullPath = `${projectRoot}/${relativePath}`;
      try {
        const content = await invoke<string>("read_file_content", { path: fullPath });
        const newFile: ManagedFile = {
          path: relativePath,
          content,
          originalContent: content,
          isDirty: false,
          language: getLanguageFromPath(relativePath),
        };

        setOpenFiles((prev) => [...prev, newFile]);
        setActiveFilePath(relativePath);
      } catch (err) {
        console.error("Failed to open file:", err);
        throw err;
      }
    },
    [projectRoot, openFiles]
  );

  // Close a file
  const closeFile = useCallback(
    (relativePath: string): boolean => {
      const file = openFiles.find((f) => f.path === relativePath);
      if (file?.isDirty) {
        const confirmed = window.confirm(`Save changes to ${file.path}?`);
        if (confirmed) {
          // Save before closing - caller should handle this
          return false; // Indicate save needed
        }
      }

      setOpenFiles((prev) => prev.filter((f) => f.path !== relativePath));

      // Update active file if we closed the active one
      if (activeFilePath === relativePath) {
        const remaining = openFiles.filter((f) => f.path !== relativePath);
        setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
      }

      return true; // File closed
    },
    [openFiles, activeFilePath]
  );

  // Update file content (marks as dirty)
  const updateContent = useCallback((relativePath: string, newContent: string) => {
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (f.path !== relativePath) return f;
        return {
          ...f,
          content: newContent,
          isDirty: newContent !== f.originalContent,
        };
      })
    );
  }, []);

  // Save a file
  const saveFile = useCallback(
    async (relativePath: string) => {
      const file = openFiles.find((f) => f.path === relativePath);
      if (!file) return;

      const fullPath = `${projectRoot}/${relativePath}`;
      try {
        await invoke("write_file_content", { path: fullPath, content: file.content });

        setOpenFiles((prev) =>
          prev.map((f) => {
            if (f.path !== relativePath) return f;
            return {
              ...f,
              originalContent: f.content,
              isDirty: false,
            };
          })
        );
      } catch (err) {
        console.error("Failed to save file:", err);
        throw err;
      }
    },
    [projectRoot, openFiles]
  );

  // Save all dirty files
  const saveAll = useCallback(async () => {
    const dirtyFiles = openFiles.filter((f) => f.isDirty);
    for (const file of dirtyFiles) {
      await saveFile(file.path);
    }
  }, [openFiles, saveFile]);

  // Get active file
  const activeFile = openFiles.find((f) => f.path === activeFilePath) || null;

  // Check if any files have unsaved changes
  const hasUnsavedChanges = openFiles.some((f) => f.isDirty);

  return {
    openFiles,
    activeFile,
    activeFilePath,
    setActiveFilePath,
    openFile,
    closeFile,
    updateContent,
    saveFile,
    saveAll,
    hasUnsavedChanges,
  };
}
