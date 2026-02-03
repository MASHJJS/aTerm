import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { TerminalLayout } from "./components/TerminalLayout";
import { ExitConfirmDialog } from "./components/ExitConfirmDialog";
import { StatusBar } from "./components/StatusBar";
import { CreateTaskModal } from "./components/CreateTaskModal";
import { TaskView } from "./components/TaskView";
import { killPty } from "./components/TerminalPane";
import { AppConfig, DEFAULT_CONFIG, ProjectConfig } from "./lib/config";
import type { Layout } from "./lib/layouts";
import type { TerminalProfile } from "./lib/profiles";
import type { Task } from "./lib/tasks";
import { getProviderCommand, PROVIDERS } from "./lib/providers";
import appIcon from "./assets/icon.png";

interface WorktreeInfo {
  path: string;
  branch: string;
}

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [selectedProject, setSelectedProject] = useState<ProjectConfig | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [openedProjects, setOpenedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  // Runtime layouts track unsaved changes per project (keyed by project.id)
  const [runtimeLayouts, setRuntimeLayouts] = useState<Record<string, Layout>>({});
  const [taskLayouts, setTaskLayouts] = useState<Record<string, Layout>>({});
  const [taskPaneFontSizes, setTaskPaneFontSizes] = useState<Record<string, number>>({});
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [activePtyCount, setActivePtyCount] = useState(0);
  const [createTaskProject, setCreateTaskProject] = useState<ProjectConfig | null>(null);
  const didCheckWorktreesRef = useRef(false);

  useEffect(() => {
    loadConfig();
  }, []);

  // Set window title to include [DEV] in development mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      getCurrentWindow().setTitle("aTerm [DEV]");
    }
  }, []);

  // Listen for exit request from window close
  useEffect(() => {
    const unlisten = listen("exit-requested", async () => {
      // Check how many active PTYs are running
      const count = await invoke<number>("get_active_pty_count");
      setActivePtyCount(count);
      setShowExitDialog(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  async function handleExitConfirm() {
    // Force exit - kills all PTYs and exits the process
    await invoke("force_exit");
  }

  function handleExitCancel() {
    setShowExitDialog(false);
  }

  // Track when a project is selected for the first time and initialize its runtime layout
  useEffect(() => {
    if (selectedProject && !openedProjects.has(selectedProject.id)) {
      setOpenedProjects((prev) => new Set([...prev, selectedProject.id]));
      // Initialize runtime layout from saved layout
      const savedLayout = config.layouts.find((l) => l.id === selectedProject.layoutId) || config.layouts[0];
      if (savedLayout && !runtimeLayouts[selectedProject.id]) {
        setRuntimeLayouts((prev) => ({
          ...prev,
          [selectedProject.id]: JSON.parse(JSON.stringify(savedLayout)), // Deep copy
        }));
      }
    }
  }, [selectedProject, openedProjects, config.layouts, runtimeLayouts]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+1-9: Switch projects
      if (e.metaKey && e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key, 10) - 1;
        if (index < config.projects.length) {
          e.preventDefault();
          setSelectedProject(config.projects[index]);
          setSelectedTask(null);
        }
      }
      // Cmd+B: Toggle sidebar
      if (e.metaKey && e.key === "b") {
        e.preventDefault();
        setSidebarVisible((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config.projects]);

  // Save sidebar visibility preference when it changes
  useEffect(() => {
    if (!loading && config.sidebarVisible !== sidebarVisible) {
      updateConfig({ ...config, sidebarVisible });
    }
  }, [sidebarVisible]);

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
        // Merge with defaults to ensure all fields exist
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
    setSelectedTask(null);
  }

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
          panes: [
            {
              id: "main",
              profileId: providerProfileId,
              flex: 1,
            },
          ],
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
    const confirmed = window.confirm(
      `Delete task \"${task.name}\" and remove its worktree?`
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
    setTaskPaneFontSizes((prev) => ({
      ...prev,
      [paneInstanceId]: fontSize,
    }));
  }

  useEffect(() => {
    if (!selectedTask) return;
    const project = config.projects.find(
      (p) => p.id === selectedTask.projectId
    );
    const task = project?.tasks?.find((t) => t.id === selectedTask.id);
    if (!task) {
      setSelectedTask(null);
    } else if (task !== selectedTask) {
      setSelectedTask(task);
    }
  }, [config.projects, selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask || !selectedProject) return;
    ensureTaskLayout(selectedTask, selectedProject);
  }, [selectedTask?.id, selectedProject?.id, config.profiles]);

  // Clean up opened projects set when a project is removed
  function handleConfigChange(newConfig: AppConfig) {
    const projectIds = new Set(newConfig.projects.map((p) => p.id));
    const removedProjects = config.projects.filter((p) => !projectIds.has(p.id));

    if (removedProjects.length > 0) {
      removedProjects.forEach((project) => {
        project.tasks?.forEach((task) => {
          invoke("remove_worktree", { worktreePath: task.worktreePath }).catch(
            console.error
          );
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

    const newOpened = new Set([...openedProjects].filter((id) => projectIds.has(id)));
    if (newOpened.size !== openedProjects.size) {
      setOpenedProjects(newOpened);
    }
    // Also clean up runtime layouts
    const newRuntimeLayouts = { ...runtimeLayouts };
    for (const id of Object.keys(newRuntimeLayouts)) {
      if (!projectIds.has(id)) {
        delete newRuntimeLayouts[id];
      }
    }
    setRuntimeLayouts(newRuntimeLayouts);

    const updatedSelectedProject = selectedProject
      ? newConfig.projects.find((p) => p.id === selectedProject.id) || null
      : null;
    if (selectedProject && !updatedSelectedProject) {
      setSelectedProject(newConfig.projects[0] || null);
    } else if (updatedSelectedProject && updatedSelectedProject !== selectedProject) {
      setSelectedProject(updatedSelectedProject);
    }

    if (selectedTask) {
      const updatedTaskProject = newConfig.projects.find(
        (p) => p.id === selectedTask.projectId
      );
      const updatedTask = updatedTaskProject?.tasks?.find(
        (t) => t.id === selectedTask.id
      );
      if (!updatedTask) {
        setSelectedTask(null);
      } else if (updatedTask !== selectedTask) {
        setSelectedTask(updatedTask);
      }
    }

    updateConfig(newConfig);
  }

  // Save the current runtime layout to the saved config
  function handleSaveWindowArrangement(projectId: string) {
    const project = config.projects.find((p) => p.id === projectId);
    const runtimeLayout = runtimeLayouts[projectId];
    if (!project || !runtimeLayout) return;

    // Check if this project already has a project-specific layout
    const projectSpecificLayoutId = `project-${projectId}`;
    const hasProjectSpecificLayout = config.layouts.some((l) => l.id === projectSpecificLayoutId);

    if (hasProjectSpecificLayout) {
      // Update the existing project-specific layout
      const newLayouts = config.layouts.map((l) =>
        l.id === projectSpecificLayoutId ? { ...l, rows: JSON.parse(JSON.stringify(runtimeLayout.rows)) } : l
      );
      updateConfig({ ...config, layouts: newLayouts });
    } else {
      // Create a new project-specific layout (clone from runtime)
      const newLayout: Layout = {
        id: projectSpecificLayoutId,
        name: `${project.name} Layout`,
        rows: JSON.parse(JSON.stringify(runtimeLayout.rows)),
      };
      // Update the project to use this new layout
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

  // Restore the saved layout to runtime
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

  // Update runtime layout (not saved to config)
  function handleRuntimeLayoutChange(projectId: string, newLayout: Layout) {
    setRuntimeLayouts((prev) => ({
      ...prev,
      [projectId]: newLayout,
    }));
  }

  // Update runtime layout AND persist to config (for renames, etc.)
  function handlePersistentLayoutChange(projectId: string, newLayout: Layout) {
    // Update runtime state
    setRuntimeLayouts((prev) => ({
      ...prev,
      [projectId]: newLayout,
    }));

    // Also save to config - use same logic as handleSaveWindowArrangement
    const project = config.projects.find((p) => p.id === projectId);
    if (!project) return;

    const projectSpecificLayoutId = `project-${projectId}`;
    const hasProjectSpecificLayout = config.layouts.some((l) => l.id === projectSpecificLayoutId);

    if (hasProjectSpecificLayout || project.layoutId === projectSpecificLayoutId) {
      // Update existing project-specific layout
      const newLayouts = config.layouts.map((l) =>
        l.id === projectSpecificLayoutId ? { ...l, rows: JSON.parse(JSON.stringify(newLayout.rows)) } : l
      );
      updateConfig({ ...config, layouts: newLayouts });
    } else {
      // Create a new project-specific layout
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

  // Handle per-pane font size changes
  function handlePaneFontSizeChange(paneInstanceId: string, fontSize: number) {
    const newPaneFontSizes = {
      ...(config.paneFontSizes || {}),
      [paneInstanceId]: fontSize,
    };
    updateConfig({ ...config, paneFontSizes: newPaneFontSizes });
  }

  // Add a git pane to the current project's layout
  function handleAddGitPane() {
    if (!selectedProject) return;

    const layout = runtimeLayouts[selectedProject.id];
    if (!layout || layout.rows.length === 0) return;

    // Check if git pane already exists
    const hasGitPane = layout.rows.some((row) =>
      row.panes.some((pane) => {
        const profile = config.profiles.find((p) => p.id === pane.profileId);
        return profile?.type === "git";
      })
    );

    if (hasGitPane) return; // Already has a git pane

    // Add git pane to the first row
    const newPane = {
      id: crypto.randomUUID(),
      profileId: "git",
      flex: 1,
    };

    const newRows = layout.rows.map((row, index) => {
      if (index === 0) {
        return { ...row, panes: [...row.panes, newPane] };
      }
      return row;
    });

    handleRuntimeLayoutChange(selectedProject.id, { ...layout, rows: newRows });
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <span style={styles.loadingText}>Loading...</span>
      </div>
    );
  }

  // Get all projects that have been opened (terminals spawned)
  const openedProjectsList = config.projects.filter((p) => openedProjects.has(p.id));

  return (
    <div style={styles.container}>
      <ExitConfirmDialog
        isOpen={showExitDialog}
        activePtyCount={activePtyCount}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
      />
      <div style={styles.mainArea}>
        {sidebarVisible && (
          <ProjectSidebar
            config={config}
            selectedProject={selectedProject}
            selectedTaskId={selectedTask?.id || null}
            onSelectProject={handleSelectProject}
            onSelectTask={handleSelectTask}
            onConfigChange={handleConfigChange}
            onSaveWindowArrangement={handleSaveWindowArrangement}
            onRestoreWindowArrangement={handleRestoreWindowArrangement}
            onAddGitPane={handleAddGitPane}
            onCreateTask={(project) => setCreateTaskProject(project)}
            onDeleteTask={handleDeleteTask}
          />
        )}
        <div style={styles.main}>
        {selectedTask && selectedProject ? (
          (() => {
            const { profiles: taskProfiles } = getTaskProviderProfile(selectedProject);
            const taskLayout = taskLayouts[selectedTask.id];
            if (!taskLayout) return null;

            return (
              <TaskView
                project={selectedProject}
                task={selectedTask}
                layout={taskLayout}
                profiles={taskProfiles}
                defaultFontSize={config.defaultFontSize ?? 13}
                defaultScrollback={config.defaultScrollback ?? 10000}
                paneFontSizes={taskPaneFontSizes}
                onPaneFontSizeChange={handleTaskPaneFontSizeChange}
                onLayoutChange={(newLayout) => {
                  setTaskLayouts((prev) => ({
                    ...prev,
                    [selectedTask.id]: newLayout,
                  }));
                }}
                onPromptInjected={() => handleTaskPromptInjected(selectedTask.id)}
              />
            );
          })()
        ) : openedProjectsList.length > 0 ? (
          // Render all opened projects, hide inactive ones
          openedProjectsList.map((project) => {
            // Use runtime layout if available, otherwise fall back to saved layout
            const savedLayout = config.layouts.find((l) => l.id === project.layoutId) || config.layouts[0];
            const layout = runtimeLayouts[project.id] || savedLayout;
            const isActive = selectedProject?.id === project.id;

            return (
              <div
                key={project.id}
                style={{
                  ...styles.terminalContainer,
                  display: isActive ? "flex" : "none",
                }}
              >
                <TerminalLayout
                  project={project}
                  layout={layout}
                  profiles={config.profiles}
                  defaultFontSize={config.defaultFontSize ?? 13}
                  defaultScrollback={config.defaultScrollback ?? 10000}
                  paneFontSizes={config.paneFontSizes || {}}
                  onPaneFontSizeChange={handlePaneFontSizeChange}
                  onLayoutChange={(newLayout) => {
                    handleRuntimeLayoutChange(project.id, newLayout);
                  }}
                  onPersistentLayoutChange={(newLayout) => {
                    handlePersistentLayoutChange(project.id, newLayout);
                  }}
                  isProjectActive={isActive}
                />
              </div>
            );
          })
        ) : (
          <div style={styles.empty}>
            <div style={styles.emptyContent}>
              <img src={appIcon} alt="aTerm" style={styles.emptyIcon} />
              <h2 style={styles.emptyTitle}>Welcome to aTerm</h2>
              <p style={styles.emptyText}>
                Add a project to start your AI-powered terminal workspace
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
      <CreateTaskModal
        isOpen={!!createTaskProject}
        project={createTaskProject}
        onClose={() => setCreateTaskProject(null)}
        onTaskCreated={handleTaskCreated}
      />
      <StatusBar selectedProject={selectedProject} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
  },
  mainArea: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "var(--bg)",
    position: "relative",
  },
  terminalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "column",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    backgroundColor: "var(--bg)",
  },
  loadingText: {
    color: "var(--text-muted)",
    fontSize: "13px",
  },
  empty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContent: {
    textAlign: "center",
    maxWidth: "320px",
    padding: "40px",
  },
  emptyIcon: {
    width: "80px",
    height: "80px",
    marginBottom: "16px",
    borderRadius: "16px",
    display: "block",
    marginLeft: "auto",
    marginRight: "auto",
  },
  emptyTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "8px",
  },
  emptyText: {
    fontSize: "13px",
    color: "var(--text-muted)",
    lineHeight: 1.5,
  },
};
