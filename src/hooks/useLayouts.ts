import { useState, useEffect } from "react";
import { AppConfig, ProjectConfig } from "../lib/config";
import type { Layout } from "../lib/layouts";

interface UseLayoutsProps {
  config: AppConfig;
  updateConfig: (config: AppConfig) => void;
  selectedProject: ProjectConfig | null;
}

export function useLayouts({ config, updateConfig, selectedProject }: UseLayoutsProps) {
  const [openedProjects, setOpenedProjects] = useState<Set<string>>(new Set());
  const [runtimeLayouts, setRuntimeLayouts] = useState<Record<string, Layout>>({});

  // Initialize runtime layout when project is first opened
  useEffect(() => {
    if (selectedProject && !openedProjects.has(selectedProject.id)) {
      setOpenedProjects((prev) => new Set([...prev, selectedProject.id]));
      const savedLayout = config.layouts.find((l) => l.id === selectedProject.layoutId) || config.layouts[0];
      if (savedLayout && !runtimeLayouts[selectedProject.id]) {
        setRuntimeLayouts((prev) => ({
          ...prev,
          [selectedProject.id]: JSON.parse(JSON.stringify(savedLayout)),
        }));
      }
    }
  }, [selectedProject, openedProjects, config.layouts, runtimeLayouts]);

  function handleRuntimeLayoutChange(projectId: string, newLayout: Layout) {
    setRuntimeLayouts((prev) => ({ ...prev, [projectId]: newLayout }));
  }

  function handlePersistentLayoutChange(projectId: string, newLayout: Layout) {
    setRuntimeLayouts((prev) => ({ ...prev, [projectId]: newLayout }));

    const project = config.projects.find((p) => p.id === projectId);
    if (!project) return;

    const projectSpecificLayoutId = `project-${projectId}`;
    const hasProjectSpecificLayout = config.layouts.some((l) => l.id === projectSpecificLayoutId);

    if (hasProjectSpecificLayout || project.layoutId === projectSpecificLayoutId) {
      const newLayouts = config.layouts.map((l) =>
        l.id === projectSpecificLayoutId
          ? { ...l, rows: JSON.parse(JSON.stringify(newLayout.rows)) }
          : l
      );
      updateConfig({ ...config, layouts: newLayouts });
    } else {
      const newLayoutObj: Layout = {
        id: projectSpecificLayoutId,
        name: `${project.name} Layout`,
        rows: JSON.parse(JSON.stringify(newLayout.rows)),
      };
      const newProjects = config.projects.map((p) =>
        p.id === projectId ? { ...p, layoutId: projectSpecificLayoutId } : p
      );
      updateConfig({
        ...config,
        layouts: [...config.layouts, newLayoutObj],
        projects: newProjects,
      });
    }
  }

  function handleSaveWindowArrangement(projectId: string) {
    const project = config.projects.find((p) => p.id === projectId);
    const runtimeLayout = runtimeLayouts[projectId];
    if (!project || !runtimeLayout) return;

    const projectSpecificLayoutId = `project-${projectId}`;
    const hasProjectSpecificLayout = config.layouts.some((l) => l.id === projectSpecificLayoutId);

    if (hasProjectSpecificLayout) {
      const newLayouts = config.layouts.map((l) =>
        l.id === projectSpecificLayoutId
          ? { ...l, rows: JSON.parse(JSON.stringify(runtimeLayout.rows)) }
          : l
      );
      updateConfig({ ...config, layouts: newLayouts });
    } else {
      const newLayout: Layout = {
        id: projectSpecificLayoutId,
        name: `${project.name} Layout`,
        rows: JSON.parse(JSON.stringify(runtimeLayout.rows)),
      };
      const newProjects = config.projects.map((p) =>
        p.id === projectId ? { ...p, layoutId: projectSpecificLayoutId } : p
      );
      updateConfig({
        ...config,
        layouts: [...config.layouts, newLayout],
        projects: newProjects,
      });
    }
  }

  function handleRestoreWindowArrangement(projectId: string) {
    const project = config.projects.find((p) => p.id === projectId);
    if (!project) return;

    const savedLayout = config.layouts.find((l) => l.id === project.layoutId) || config.layouts[0];
    if (savedLayout) {
      setRuntimeLayouts((prev) => ({
        ...prev,
        [projectId]: JSON.parse(JSON.stringify(savedLayout)),
      }));
    }
  }

  function handleAddGitPane() {
    if (!selectedProject) return;

    const layout = runtimeLayouts[selectedProject.id];
    if (!layout || layout.rows.length === 0) return;

    const hasGitPane = layout.rows.some((row) =>
      row.panes.some((pane) => {
        const profile = config.profiles.find((p) => p.id === pane.profileId);
        return profile?.type === "git";
      })
    );

    if (hasGitPane) return;

    const newPane = { id: crypto.randomUUID(), profileId: "git", flex: 1 };
    const newRows = layout.rows.map((row, index) => {
      if (index === 0) {
        return { ...row, panes: [...row.panes, newPane] };
      }
      return row;
    });

    handleRuntimeLayoutChange(selectedProject.id, { ...layout, rows: newRows });
  }

  // Cleanup when projects are removed
  function cleanupRemovedProjects(projectIds: Set<string>) {
    const newOpened = new Set([...openedProjects].filter((id) => projectIds.has(id)));
    if (newOpened.size !== openedProjects.size) {
      setOpenedProjects(newOpened);
    }

    const newRuntimeLayouts = { ...runtimeLayouts };
    for (const id of Object.keys(newRuntimeLayouts)) {
      if (!projectIds.has(id)) {
        delete newRuntimeLayouts[id];
      }
    }
    setRuntimeLayouts(newRuntimeLayouts);
  }

  return {
    openedProjects,
    runtimeLayouts,
    handleRuntimeLayoutChange,
    handlePersistentLayoutChange,
    handleSaveWindowArrangement,
    handleRestoreWindowArrangement,
    handleAddGitPane,
    cleanupRemovedProjects,
  };
}
