import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  hasStaged: boolean;
  onCommit: (message: string) => void;
  onCommitAndPush: (message: string) => void;
  isCommitting: boolean;
}

export function CommitForm({ hasStaged, onCommit, onCommitAndPush, isCommitting }: Props) {
  const [message, setMessage] = useState("");

  const canCommit = hasStaged && message.trim().length > 0 && !isCommitting;

  function handleCommit() {
    if (canCommit) {
      onCommit(message.trim());
      setMessage("");
    }
  }

  function handleCommitAndPush() {
    if (canCommit) {
      onCommitAndPush(message.trim());
      setMessage("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && e.metaKey && canCommit) {
      e.preventDefault();
      handleCommit();
    }
  }

  return (
    <div className="p-2 border-t border-border bg-secondary">
      <Textarea
        className="w-full resize-none text-xs"
        placeholder={hasStaged ? "Commit message..." : "Stage changes to commit"}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={!hasStaged || isCommitting}
        rows={2}
      />
      <div className="flex gap-2 mt-2">
        <Button
          variant="secondary"
          className="flex-1 text-xs"
          onClick={handleCommit}
          disabled={!canCommit}
        >
          {isCommitting ? "Committing..." : "Commit"}
        </Button>
        <Button
          className="flex-1 text-xs bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleCommitAndPush}
          disabled={!canCommit}
        >
          Commit & Push
        </Button>
      </div>
    </div>
  );
}
