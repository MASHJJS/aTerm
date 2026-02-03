import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SearchAddon } from "@xterm/addon-search";

const SEARCH_DECORATIONS = {
  matchBackground: "#facc15",
  matchBorder: "#facc15",
  matchOverviewRuler: "#facc15",
  activeMatchBackground: "#f97316",
  activeMatchBorder: "#f97316",
  activeMatchColorOverviewRuler: "#f97316",
};

interface SearchOverlayProps {
  searchAddon: SearchAddon | null;
  onClose: () => void;
  onFocusTerminal: () => void;
}

export function SearchOverlay({ searchAddon, onClose, onFocusTerminal }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ current: 0, total: 0 });

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleClose() {
    setQuery("");
    setResults({ current: 0, total: 0 });
    searchAddon?.clearDecorations();
    onClose();
    onFocusTerminal();
  }

  function findNext() {
    if (!searchAddon || !query) return;
    const found = searchAddon.findNext(query, {
      regex: false,
      caseSensitive: false,
      decorations: SEARCH_DECORATIONS,
    });
    if (found) {
      setResults((prev) => ({
        current: prev.total > 0 ? (prev.current % prev.total) + 1 : 1,
        total: prev.total || 1,
      }));
    }
  }

  function findPrevious() {
    if (!searchAddon || !query) return;
    const found = searchAddon.findPrevious(query, {
      regex: false,
      caseSensitive: false,
      decorations: SEARCH_DECORATIONS,
    });
    if (found) {
      setResults((prev) => ({
        current: prev.current > 1 ? prev.current - 1 : prev.total || 1,
        total: prev.total || 1,
      }));
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value) {
      searchAddon?.clearDecorations();
      setResults({ current: 0, total: 0 });
      return;
    }
    // Perform initial search to highlight matches
    if (searchAddon) {
      const found = searchAddon.findNext(value, {
        regex: false,
        caseSensitive: false,
        decorations: SEARCH_DECORATIONS,
      });
      setResults({ current: found ? 1 : 0, total: found ? 1 : 0 });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        findPrevious();
      } else {
        findNext();
      }
    }
  }

  return (
    <div className="absolute top-10 right-2 z-20 flex items-center gap-1 bg-background border border-border rounded-md p-1 shadow-lg">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-7 w-40 text-xs"
      />
      <span className="text-xs text-muted-foreground px-1 min-w-[3rem] text-center">
        {results.total > 0 ? `${results.current}/${results.total}` : "0/0"}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={findPrevious}
        title="Previous (Shift+Enter)"
        className="h-6 w-6"
      >
        ↑
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={findNext}
        title="Next (Enter)"
        className="h-6 w-6"
      >
        ↓
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleClose}
        title="Close (Escape)"
        className="h-6 w-6"
      >
        ✕
      </Button>
    </div>
  );
}

