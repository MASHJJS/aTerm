import { useEffect } from "react";
import type { ProjectConfig } from "../lib/config";

interface UseKeyboardShortcutsProps {
  projects: ProjectConfig[];
  onSelectProject: (project: ProjectConfig) => void;
  onToggleSidebar: () => void;
}

export function useKeyboardShortcuts({
  projects,
  onSelectProject,
  onToggleSidebar,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+1-9: Switch projects
      if (e.metaKey && e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key, 10) - 1;
        if (index < projects.length) {
          e.preventDefault();
          onSelectProject(projects[index]);
        }
      }
      // Cmd+B: Toggle sidebar
      if (e.metaKey && e.key === "b") {
        e.preventDefault();
        onToggleSidebar();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projects, onSelectProject, onToggleSidebar]);
}
