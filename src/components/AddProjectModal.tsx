import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronUp, Folder, GitBranch, Circle } from "lucide-react";
import { ProviderId, getProviderList } from "../lib/providers";
import { createProject, ProjectConfig } from "../lib/config";
import type { Layout } from "../lib/layouts";

interface DirEntry {
  name: string;
  path: string;
  isDir: boolean;
  isGitRepo: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded: (project: ProjectConfig) => void;
  layouts: Layout[];
}

export function AddProjectModal({ isOpen, onClose, onProjectAdded, layouts }: Props) {
  const [mode, setMode] = useState<"browse" | "clone">("browse");
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [provider, setProvider] = useState<ProviderId>("claude");
  const [layoutId, setLayoutId] = useState(layouts[0]?.id || "ai-shell");
  const [cloneUrl, setCloneUrl] = useState("");
  const [cloneDestination, setCloneDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providers = getProviderList();

  useEffect(() => {
    if (isOpen) {
      invoke<string>("get_home_dir").then((home) => {
        const devDir = `${home}/dev`;
        setCurrentPath(devDir);
        setCloneDestination(devDir);
        loadDirectory(devDir);
      });
    }
  }, [isOpen]);

  async function loadDirectory(path: string) {
    try {
      const result = await invoke<DirEntry[]>("list_directory", { path });
      setEntries(result);
      setCurrentPath(path);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  function handleEntryClick(entry: DirEntry) {
    if (entry.isDir) {
      loadDirectory(entry.path);
      setSelectedPath(null);
    }
  }

  function selectCurrentFolder() {
    const folderName = currentPath.split("/").pop() || "project";
    setSelectedPath(currentPath);
    setProjectName(folderName);
  }

  function goUp() {
    const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
    loadDirectory(parent);
    setSelectedPath(null);
  }

  async function handleAddProject() {
    if (!selectedPath || !projectName) return;

    setLoading(true);
    try {
      const gitRemote = await invoke<string | null>("get_git_remote", {
        path: selectedPath,
      });

      const project = createProject(
        projectName,
        selectedPath,
        provider,
        gitRemote || undefined,
        layoutId
      );

      onProjectAdded(project);
      onClose();
      resetForm();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCloneProject() {
    if (!cloneUrl) return;

    setLoading(true);
    setError(null);

    try {
      const repoName =
        projectName ||
        cloneUrl.split("/").pop()?.replace(".git", "") ||
        "project";
      const destination = `${cloneDestination}/${repoName}`;

      await invoke("clone_repo", { url: cloneUrl, destination });

      const project = createProject(repoName, destination, provider, cloneUrl, layoutId);

      onProjectAdded(project);
      onClose();
      resetForm();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSelectedPath(null);
    setProjectName("");
    setProvider("claude");
    setLayoutId(layouts[0]?.id || "ai-shell");
    setCloneUrl("");
    setError(null);
    setMode("browse");
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "browse" | "clone")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="clone">Clone</TabsTrigger>
          </TabsList>

          {error && (
            <div className="mt-3 px-4 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-xs">
              {error}
            </div>
          )}

          <TabsContent value="browse" className="flex-1 overflow-auto mt-4">
            <div className="flex items-center gap-2 mb-3 px-2.5 py-2 bg-muted rounded-md border border-border">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={goUp}
                title="Go up"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <span className="flex-1 text-[11px] text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                {currentPath}
              </span>
              <Button
                size="sm"
                variant={selectedPath === currentPath ? "default" : "secondary"}
                onClick={selectCurrentFolder}
                className="h-6 text-[11px]"
              >
                {selectedPath === currentPath ? "Selected" : "Select"}
              </Button>
            </div>

            <div className="max-h-[180px] overflow-auto border border-border rounded-md mb-4">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 bg-transparent border-none border-b border-border text-foreground cursor-pointer text-left text-xs transition-colors hover:bg-accent last:border-b-0",
                    !entry.isDir && "opacity-40 cursor-default"
                  )}
                  onClick={() => handleEntryClick(entry)}
                  disabled={!entry.isDir}
                >
                  <span className="text-[10px] text-primary w-3.5">
                    {entry.isGitRepo ? (
                      <GitBranch className="h-3 w-3" />
                    ) : entry.isDir ? (
                      <Folder className="h-3 w-3" />
                    ) : (
                      <Circle className="h-2 w-2" />
                    )}
                  </span>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {entry.name}
                  </span>
                  {entry.isGitRepo && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border rounded text-green-500 uppercase tracking-wider">
                      git
                    </span>
                  )}
                </button>
              ))}
            </div>

            {selectedPath && (
              <div className="flex flex-col gap-3.5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </span>
                  <Input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Provider
                  </span>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as ProviderId)}
                    className="px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-xs outline-none focus:ring-2 focus:ring-ring"
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Layout
                  </span>
                  <select
                    value={layoutId}
                    onChange={(e) => setLayoutId(e.target.value)}
                    className="px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-xs outline-none focus:ring-2 focus:ring-ring"
                  >
                    {layouts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clone" className="flex-1 overflow-auto mt-4">
            <div className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Repository URL
                </span>
                <Input
                  type="text"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Name (optional)
                </span>
                <Input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Auto-detected from URL"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Destination
                </span>
                <Input
                  type="text"
                  value={cloneDestination}
                  onChange={(e) => setCloneDestination(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Provider
                </span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as ProviderId)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Layout
                </span>
                <select
                  value={layoutId}
                  onChange={(e) => setLayoutId(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-border rounded-md text-foreground text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  {layouts.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={mode === "browse" ? handleAddProject : handleCloneProject}
            disabled={loading || (mode === "browse" ? !selectedPath : !cloneUrl)}
          >
            {loading ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
