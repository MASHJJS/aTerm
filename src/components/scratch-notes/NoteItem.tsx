import { Button } from "@/components/ui/button";
import { MoreHorizontal, Copy, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ScratchNote } from "../../lib/notes";
import { formatRelativeTime } from "../../lib/notes";

interface Props {
  note: ScratchNote;
  onEdit: (note: ScratchNote) => void;
  onCopy: (note: ScratchNote) => void;
  onDelete: (note: ScratchNote) => void;
}

export function NoteItem({ note, onEdit, onCopy, onDelete }: Props) {
  const lines = note.content.split("\n");
  const isLong = lines.length > 3 || note.content.length > 200;
  const preview = isLong
    ? lines.slice(0, 3).join("\n").slice(0, 200) + "..."
    : note.content;

  return (
    <div
      className="group relative rounded-md border border-border bg-background/50 p-3 hover:bg-accent/30 transition-colors cursor-pointer"
      onClick={() => onEdit(note)}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono line-clamp-3">
            {preview}
          </pre>
          <div className="mt-2 text-[10px] text-muted-foreground">
            {formatRelativeTime(note.updatedAt)}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onCopy(note)}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(note)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
