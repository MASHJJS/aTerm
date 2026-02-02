import { cn } from "@/lib/utils";

export type GitTab = "changes" | "history";

interface Props {
  activeTab: GitTab;
  onTabChange: (tab: GitTab) => void;
}

export function GitPanelTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="flex border-b border-border bg-secondary">
      <button
        className={cn(
          "flex-1 px-4 py-2 bg-transparent border-none border-b-2 border-transparent text-muted-foreground text-xs font-medium cursor-pointer transition-colors",
          activeTab === "changes" && "text-foreground border-b-orange-500"
        )}
        onClick={() => onTabChange("changes")}
      >
        Changes
      </button>
      <button
        className={cn(
          "flex-1 px-4 py-2 bg-transparent border-none border-b-2 border-transparent text-muted-foreground text-xs font-medium cursor-pointer transition-colors",
          activeTab === "history" && "text-foreground border-b-orange-500"
        )}
        onClick={() => onTabChange("history")}
      >
        History
      </button>
    </div>
  );
}
