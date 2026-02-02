import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CommitSummary, CommitFile } from "../../lib/git";
import { CommitItem } from "./CommitItem";
import { DiffViewer } from "./DiffViewer";

interface Props {
  cwd: string;
}

export function CommitHistory({ cwd }: Props) {
  const [commits, setCommits] = useState<CommitSummary[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [commitFiles, setCommitFiles] = useState<Record<string, CommitFile[]>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState<string | null>(null);

  useEffect(() => {
    loadCommits();
  }, [cwd]);

  async function loadCommits() {
    setIsLoading(true);
    try {
      const history = await invoke<CommitSummary[]>("get_commit_history", {
        path: cwd,
        limit: 50,
      });
      setCommits(history);
    } catch (err) {
      console.error("Failed to load commit history:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectCommit(hash: string) {
    if (selectedCommit === hash) {
      setSelectedCommit(null);
      setSelectedFile(null);
      setDiff("");
      return;
    }

    setSelectedCommit(hash);
    setSelectedFile(null);
    setDiff("");

    if (!commitFiles[hash]) {
      setLoadingFiles(hash);
      try {
        const files = await invoke<CommitFile[]>("get_commit_files", {
          path: cwd,
          hash,
        });
        setCommitFiles((prev) => ({ ...prev, [hash]: files }));
      } catch (err) {
        console.error("Failed to load commit files:", err);
      } finally {
        setLoadingFiles(null);
      }
    }
  }

  async function handleSelectFile(file: string) {
    if (!selectedCommit) return;

    setSelectedFile(file);
    try {
      const diffContent = await invoke<string>("get_commit_diff", {
        path: cwd,
        hash: selectedCommit,
        file,
      });
      setDiff(diffContent);
    } catch (err) {
      console.error("Failed to load diff:", err);
      setDiff("");
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
        <span>Loading history...</span>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <span className="text-xs">No commits yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-1/2 min-w-[300px] overflow-auto border-r border-border">
        {commits.map((commit) => (
          <CommitItem
            key={commit.hash}
            commit={commit}
            isSelected={selectedCommit === commit.hash}
            files={commitFiles[commit.hash] || null}
            selectedFile={selectedCommit === commit.hash ? selectedFile : null}
            onSelect={() => handleSelectCommit(commit.hash)}
            onSelectFile={handleSelectFile}
            isLoading={loadingFiles === commit.hash}
          />
        ))}
      </div>
      <div className="flex-1 flex overflow-hidden">
        <DiffViewer diff={diff} fileName={selectedFile || undefined} />
      </div>
    </div>
  );
}
