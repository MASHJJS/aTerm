import type { ProjectConfig } from "../lib/config";
import type { Layout } from "../lib/layouts";
import type { TerminalProfile } from "../lib/profiles";
import type { Task } from "../lib/tasks";
import { TerminalLayout } from "./TerminalLayout";

interface Props {
  project: ProjectConfig;
  task: Task;
  layout: Layout;
  profiles: TerminalProfile[];
  defaultFontSize: number;
  defaultScrollback: number;
  paneFontSizes: Record<string, number>;
  onPaneFontSizeChange: (paneInstanceId: string, fontSize: number) => void;
  onLayoutChange: (layout: Layout) => void;
  onPromptInjected: () => void;
}

export function TaskView({
  project,
  task,
  layout,
  profiles,
  defaultFontSize,
  defaultScrollback,
  paneFontSizes,
  onPaneFontSizeChange,
  onLayoutChange,
  onPromptInjected,
}: Props) {
  const shouldInject = !!task.initialPrompt && !task.promptInjected;
  const taskProject: ProjectConfig = {
    ...project,
    id: `task-${task.id}`,
    name: `${project.name} / ${task.name}`,
    path: task.worktreePath,
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">{task.name}</span>
          <span className="text-xs text-muted-foreground">{task.branch}</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <TerminalLayout
          project={taskProject}
          layout={layout}
          profiles={profiles}
          defaultFontSize={defaultFontSize}
          defaultScrollback={defaultScrollback}
          paneFontSizes={paneFontSizes}
          onPaneFontSizeChange={onPaneFontSizeChange}
          onLayoutChange={onLayoutChange}
          initialInputByPaneId={
            shouldInject && task.initialPrompt
              ? { main: task.initialPrompt }
              : undefined
          }
          onInitialInputSentByPaneId={
            shouldInject ? { main: onPromptInjected } : undefined
          }
          isProjectActive={true}
        />
      </div>
    </div>
  );
}
