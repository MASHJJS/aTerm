export interface Task {
  id: string;
  projectId: string;
  name: string;
  branch: string;
  worktreePath: string;
  initialPrompt?: string;
  status: "idle" | "active";
  createdAt: string;
  promptInjected?: boolean;
}

export function createTask(
  projectId: string,
  name: string,
  branch: string,
  worktreePath: string,
  initialPrompt?: string
): Task {
  return {
    id: crypto.randomUUID(),
    projectId,
    name,
    branch,
    worktreePath,
    initialPrompt: initialPrompt?.trim() || undefined,
    status: "idle",
    createdAt: new Date().toISOString(),
    promptInjected: false,
  };
}

