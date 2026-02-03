import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";
import { killPty } from "../components/TerminalPane";
import { AppConfig, ProjectConfig } from "../lib/config";
import type { Layout } from "../lib/layouts";
import type { TerminalProfile } from "../lib/profiles";
import type { Task } from "../lib/tasks";
import { getProviderCommand, PROVIDERS } from "../lib/providers";

interface UseTasksProps {
  config: AppConfig;
  updateConfig: (config: AppConfig) => void;
  selectedProject: ProjectConfig | null;
  setSelectedProject: (project: ProjectConfig | null) => void;
}

export function useTasks({
  config,
  updateConfig,
  selectedProject,
  setSelectedProject,
}: UseTasksProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskLayouts, setTaskLayouts] = useState<Record<string, Layout>>({});
  const [taskPaneFontSizes, setTaskPaneFontSizes] = useState<Record<string, number>>({});

  // Sync selectedTask with config changes
  useEffect(() => {
    if (!selectedTask) return;
    const project = config.projects.find((p) => p.id === selectedTask.projectId);
    const task = project?.tasks?.find((t) => t.id === selectedTask.id);
    if (!task) {
      setSelectedTask(null);
    } else if (task !== selectedTask) {
      setSelectedTask(task);
    }
  }, [config.projects, selectedTask?.id]);

  // Ensure task layout exists when task is selected
  useEffect(() => {
    if (!selectedTask || !selectedProject) return;
    ensureTaskLayout(selectedTask, selectedProject);
  }, [selectedTask?.id, selectedProject?.id, config.profiles]);

  function getTaskProviderProfile(project: ProjectConfig): {
    profiles: TerminalProfile[];
    providerProfileId: string;
  } {
    if (project.provider === "shell") {
      return { profiles: config.profiles, providerProfileId: "shell" };
    }

    const providerProfileId = `provider-${project.provider}`;
    const existing = config.profiles.find((p) => p.id === providerProfileId);
    if (existing) {
      return { profiles: config.profiles, providerProfileId: existing.id };
    }

    const providerDef = PROVIDERS[project.provider];
    const baseCommand = getProviderCommand(project.provider) || project.provider;
    const commandParts = [baseCommand, ...(providerDef?.defaultArgs || [])].filter(Boolean);
    const command = commandParts.join(" ").trim();
    const providerName = providerDef?.name || project.provider;
    const providerProfile: TerminalProfile = {
      id: providerProfileId,
      name: providerName,
      command,
      color: "#888888",
    };

    return { profiles: [...config.profiles, providerProfile], providerProfileId };
  }

  function createTaskLayout(task: Task, providerProfileId: string): Layout {
    return {
      id: `task-${task.id}`,
      name: `${task.name} Task`,
      rows: [
        {
          id: crypto.randomUUID(),
          flex: 1,
          panes: [{ id: "main", profileId: providerProfileId, flex: 1 }],
        },
      ],
    };
  }

  function ensureTaskLayout(task: Task, project: ProjectConfig) {
    if (taskLayouts[task.id]) return;
    const { providerProfileId } = getTaskProviderProfile(project);
    setTaskLayouts((prev) => ({
      ...prev,
      [task.id]: createTaskLayout(task, providerProfileId),
    }));
  }

  function handleSelectTask(projectId: string, taskId: string) {
    const project = config.projects.find((p) => p.id === projectId) || null;
    const task = project?.tasks?.find((t) => t.id === taskId) || null;
    if (!project || !task) return;
    setSelectedProject(project);
    setSelectedTask(task);
    ensureTaskLayout(task, project);
  }

  function handleTaskCreated(task: Task) {
    const project = config.projects.find((p) => p.id === task.projectId);
    if (!project) return;

    const newTasks = [...(project.tasks || []), task];
    const updatedProject: ProjectConfig = { ...project, tasks: newTasks };
    const newProjects = config.projects.map((p) =>
      p.id === project.id ? updatedProject : p
    );

    updateConfig({ ...config, projects: newProjects });
    setSelectedProject(updatedProject);
    setSelectedTask(task);
    ensureTaskLayout(task, updatedProject);
  }

  async function handleDeleteTask(project: ProjectConfig, task: Task) {
    const confirmed = await ask(
      `Delete task "${task.name}" and remove its worktree?`,
      { title: "Delete Task", kind: "warning" }
    );
    if (!confirmed) return;

    try {
      await invoke("remove_worktree", { worktreePath: task.worktreePath });
    } catch (e) {
      alert(`Failed to remove worktree: ${e}`);
      return;
    }

    killPty(`task-${task.id}-main`);

    setTaskLayouts((prev) => {
      const next = { ...prev };
      delete next[task.id];
      return next;
    });

    setTaskPaneFontSizes((prev) => {
      const next: Record<string, number> = {};
      const prefix = `task-${task.id}-`;
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(prefix)) {
          next[key] = value;
        }
      }
      return next;
    });

    const remainingTasks = (project.tasks || []).filter((t) => t.id !== task.id);
    const updatedProject: ProjectConfig = {
      ...project,
      tasks: remainingTasks.length ? remainingTasks : undefined,
    };
    const newProjects = config.projects.map((p) =>
      p.id === project.id ? updatedProject : p
    );
    updateConfig({ ...config, projects: newProjects });

    if (selectedTask?.id === task.id) {
      setSelectedTask(null);
    }
  }

  function handleTaskPromptInjected(taskId: string) {
    const project = config.projects.find((p) =>
      p.tasks?.some((t) => t.id === taskId)
    );
    if (!project || !project.tasks) return;

    const updatedTasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, promptInjected: true } : t
    );
    const updatedProject: ProjectConfig = { ...project, tasks: updatedTasks };
    const newProjects = config.projects.map((p) =>
      p.id === project.id ? updatedProject : p
    );
    updateConfig({ ...config, projects: newProjects });

    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, promptInjected: true });
    }
  }

  function handleTaskPaneFontSizeChange(paneInstanceId: string, fontSize: number) {
    setTaskPaneFontSizes((prev) => ({ ...prev, [paneInstanceId]: fontSize }));
  }

  function handleAddGitPaneToTask(task: Task) {
    const layout = taskLayouts[task.id];
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

    setTaskLayouts((prev) => ({
      ...prev,
      [task.id]: { ...layout, rows: newRows },
    }));
  }

  function handleTaskLayoutChange(taskId: string, newLayout: Layout) {
    setTaskLayouts((prev) => ({ ...prev, [taskId]: newLayout }));
  }

  // Cleanup tasks when projects are removed
  function cleanupRemovedProjectTasks(removedProjects: ProjectConfig[]) {
    removedProjects.forEach((project) => {
      project.tasks?.forEach((task) => {
        invoke("remove_worktree", { worktreePath: task.worktreePath }).catch(console.error);
        killPty(`task-${task.id}-main`);
      });
    });

    setTaskLayouts((prev) => {
      const next = { ...prev };
      removedProjects.forEach((project) => {
        project.tasks?.forEach((task) => {
          delete next[task.id];
        });
      });
      return next;
    });

    setTaskPaneFontSizes((prev) => {
      const next: Record<string, number> = {};
      const prefixes = new Set(
        removedProjects.flatMap((project) =>
          (project.tasks || []).map((task) => `task-${task.id}-`)
        )
      );
      for (const [key, value] of Object.entries(prev)) {
        let shouldKeep = true;
        for (const prefix of prefixes) {
          if (key.startsWith(prefix)) {
            shouldKeep = false;
            break;
          }
        }
        if (shouldKeep) {
          next[key] = value;
        }
      }
      return next;
    });
  }

  return {
    selectedTask,
    setSelectedTask,
    taskLayouts,
    taskPaneFontSizes,
    getTaskProviderProfile,
    handleSelectTask,
    handleTaskCreated,
    handleDeleteTask,
    handleTaskPromptInjected,
    handleTaskPaneFontSizeChange,
    handleAddGitPaneToTask,
    handleTaskLayoutChange,
    cleanupRemovedProjectTasks,
  };
}
