import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppConfig, DEFAULT_CONFIG, ProjectConfig } from "../lib/config";

interface WorktreeInfo {
  path: string;
  branch: string;
}

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [selectedProject, setSelectedProject] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const didCheckWorktreesRef = useRef(false);

  useEffect(() => {
    loadConfig();
  }, []);

  // Save sidebar visibility preference when it changes
  useEffect(() => {
    if (!loading && config.sidebarVisible !== sidebarVisible) {
      updateConfig({ ...config, sidebarVisible });
    }
  }, [sidebarVisible]);

  // Cleanup orphaned tasks on load
  useEffect(() => {
    if (loading || didCheckWorktreesRef.current) return;
    didCheckWorktreesRef.current = true;

    async function cleanupOrphanedTasks() {
      let changed = false;
      const updatedProjects = await Promise.all(
        config.projects.map(async (project) => {
          if (!project.tasks || project.tasks.length === 0) return project;
          try {
            const worktrees = await invoke<WorktreeInfo[]>("list_worktrees", {
              projectPath: project.path,
            });
            const existing = new Set(worktrees.map((wt) => wt.path));
            const filtered = project.tasks.filter((task) =>
              existing.has(task.worktreePath)
            );
            if (filtered.length !== project.tasks.length) {
              changed = true;
              return {
                ...project,
                tasks: filtered.length ? filtered : undefined,
              };
            }
          } catch (err) {
            console.warn("Failed to list worktrees for project", err);
          }
          return project;
        })
      );

      if (changed) {
        updateConfig({ ...config, projects: updatedProjects });
      }
    }

    cleanupOrphanedTasks();
  }, [loading, config.projects]);

  async function loadConfig() {
    try {
      const savedConfig = await invoke<AppConfig | null>("load_config");
      if (savedConfig) {
        const merged: AppConfig = {
          ...DEFAULT_CONFIG,
          ...savedConfig,
          profiles: savedConfig.profiles?.length ? savedConfig.profiles : DEFAULT_CONFIG.profiles,
          layouts: savedConfig.layouts?.length ? savedConfig.layouts : DEFAULT_CONFIG.layouts,
          paneFontSizes: savedConfig.paneFontSizes || {},
        };
        setConfig(merged);
        setSidebarVisible(merged.sidebarVisible !== false);
        if (merged.projects.length > 0) {
          setSelectedProject(merged.projects[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load config:", e);
    } finally {
      setLoading(false);
    }
  }

  async function updateConfig(newConfig: AppConfig) {
    setConfig(newConfig);
    try {
      await invoke("save_config", { config: newConfig });
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  }

  function handleSelectProject(project: ProjectConfig | null) {
    setSelectedProject(project);
  }

  function handlePaneFontSizeChange(paneInstanceId: string, fontSize: number) {
    const newPaneFontSizes = {
      ...(config.paneFontSizes || {}),
      [paneInstanceId]: fontSize,
    };
    updateConfig({ ...config, paneFontSizes: newPaneFontSizes });
  }

  return {
    config,
    setConfig,
    updateConfig,
    selectedProject,
    setSelectedProject,
    handleSelectProject,
    loading,
    sidebarVisible,
    setSidebarVisible,
    handlePaneFontSizeChange,
  };
}
