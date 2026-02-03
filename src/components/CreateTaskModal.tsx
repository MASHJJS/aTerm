import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectConfig } from "../lib/config";
import type { GitStatus } from "../lib/git";
import { createTask } from "../lib/tasks";

interface WorktreeInfo {
  path: string;
  branch: string;
}

interface Props {
  isOpen: boolean;
  project: ProjectConfig | null;
  onClose: () => void;
  onTaskCreated: (task: ReturnType<typeof createTask>) => void;
}

const CURRENT_BRANCH_VALUE = "__current__";

function slugifyTaskName(name: string): string {
  let slug = "";
  let prevDash = false;

  for (const ch of name) {
    const lower = ch.toLowerCase();
    const isAlphaNum = /[a-z0-9]/.test(lower);
    if (isAlphaNum) {
      slug += lower;
      prevDash = false;
    } else if (!prevDash && slug.length > 0) {
      slug += "-";
      prevDash = true;
    }
  }

  slug = slug.replace(/^-+|-+$/g, "");
  return slug || "task";
}

export function CreateTaskModal({ isOpen, project, onClose, onTaskCreated }: Props) {
  const [name, setName] = useState("");
  const [baseBranch, setBaseBranch] = useState(CURRENT_BRANCH_VALUE);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("HEAD");
  const [dirtyCount, setDirtyCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGitRepo, setIsGitRepo] = useState(true);

  const trimmedName = name.trim();
  const slug = useMemo(() => slugifyTaskName(trimmedName), [trimmedName]);

  useEffect(() => {
    if (!isOpen || !project) return;

    setName("");
    setInitialPrompt("");
    setBaseBranch(CURRENT_BRANCH_VALUE);
    setBranches([]);
    setCurrentBranch("HEAD");
    setDirtyCount(0);
    setError(null);
    setIsGitRepo(true);

    async function loadGitData() {
      try {
        const status = await invoke<GitStatus>("get_git_status", { path: project.path });
        const dirty =
          status.staged.length + status.unstaged.length + status.untracked.length;
        setDirtyCount(dirty);
        setCurrentBranch(status.branch || "HEAD");
      } catch (err) {
        setIsGitRepo(false);
        setError("Project is not a git repository.");
        return;
      }

      try {
        const list = await invoke<string[]>("list_git_branches", {
          projectPath: project.path,
        });
        setBranches(list);
      } catch (err) {
        console.error("Failed to list branches:", err);
        setBranches([]);
      }
    }

    loadGitData();
  }, [isOpen, project?.id, project?.path]);

  async function handleCreate() {
    if (!project || !trimmedName || !isGitRepo) return;

    if (dirtyCount > 0) {
      const confirmed = window.confirm(
        "This repository has uncommitted changes. Create a worktree anyway?"
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseRef =
        baseBranch === CURRENT_BRANCH_VALUE ? undefined : baseBranch;

      const worktree = await invoke<WorktreeInfo>("create_worktree", {
        projectPath: project.path,
        taskName: trimmedName,
        baseRef,
      });

      const task = createTask(
        project.id,
        trimmedName,
        worktree.branch,
        worktree.path,
        initialPrompt
      );

      onTaskCreated(task);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const canCreate = !!project && trimmedName.length > 0 && isGitRepo && !loading;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="mt-3 px-4 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-xs">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Name
            </span>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="fix-auth-bug"
              disabled={!isGitRepo}
            />
            <span className="text-[10px] text-muted-foreground">
              Slug: {slug}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Base Branch
            </span>
            <Select
              value={baseBranch}
              onValueChange={setBaseBranch}
              disabled={!isGitRepo}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CURRENT_BRANCH_VALUE}>
                  Current ({currentBranch})
                </SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Initial Prompt (optional)
            </span>
            <Textarea
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              placeholder="Describe the task for your coding assistant..."
              className="min-h-[120px] text-sm"
              disabled={!isGitRepo}
            />
          </label>

          {dirtyCount > 0 && (
            <div className="px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              Working tree has {dirtyCount} uncommitted change{dirtyCount === 1 ? "" : "s"}.
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
