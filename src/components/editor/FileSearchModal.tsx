import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import Fuse from "fuse.js";
import { cn } from "@/lib/utils";
import { getFileIcon } from "../../lib/fileIcons";

interface Props {
  isOpen: boolean;
  projectRoot: string;
  onClose: () => void;
  onSelectFile: (path: string) => void;
}

export function FileSearchModal({ isOpen, projectRoot, onClose, onSelectFile }: Props) {
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fuseRef = useRef<Fuse<string> | null>(null);

  // Load all files when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      loadFiles();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, projectRoot]);

  // Update Fuse instance when files change
  useEffect(() => {
    fuseRef.current = new Fuse(files, {
      threshold: 0.4,
      distance: 100,
      includeScore: true,
    });
    // Show initial results (most recently at top, limited)
    setResults(files.slice(0, 20));
  }, [files]);

  // Search when query changes
  useEffect(() => {
    if (!fuseRef.current) return;

    if (query.trim() === "") {
      setResults(files.slice(0, 20));
    } else {
      const searchResults = fuseRef.current.search(query, { limit: 20 });
      setResults(searchResults.map((r) => r.item));
    }
    setSelectedIndex(0);
  }, [query, files]);

  async function loadFiles() {
    setIsLoading(true);
    try {
      const allFiles = await invoke<string[]>("list_all_project_files", {
        root: projectRoot,
      });
      setFiles(allFiles);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            onSelectFile(results[selectedIndex]);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [results, selectedIndex, onSelectFile, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-modal"
      onClick={onClose}
    >
      <div
        className="w-[550px] max-h-[60vh] bg-background rounded-lg border border-border shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-border">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
            className="w-full bg-secondary text-foreground text-sm px-3 py-2 rounded-md border border-border outline-none focus:border-primary"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
              Loading files...
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
              {query ? "No matching files" : "No files found"}
            </div>
          ) : (
            results.map((filePath, index) => {
              const fileName = filePath.split("/").pop() || filePath;
              const dirPath = filePath.includes("/")
                ? filePath.slice(0, filePath.lastIndexOf("/"))
                : "";
              const icon = getFileIcon(fileName, false);

              return (
                <div
                  key={filePath}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => {
                    onSelectFile(filePath);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span
                    className="shrink-0 text-[9px] font-bold w-4 text-center"
                    style={{ color: icon.color }}
                  >
                    {icon.icon}
                  </span>
                  <span className="font-medium truncate">{fileName}</span>
                  {dirPath && (
                    <span className="text-muted-foreground text-xs truncate ml-auto">
                      {dirPath}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
