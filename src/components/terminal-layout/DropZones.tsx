import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { EdgePosition } from "./types";

interface RowDropZoneProps {
  id: string;
}

export function RowDropZone({ id }: RowDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-8 mx-1 rounded border-2 border-dashed transition-all duration-150 flex items-center justify-center shrink-0",
        isOver
          ? "border-primary bg-primary/20"
          : "border-muted-foreground/30 bg-muted/30"
      )}
    >
      <span className={cn(
        "text-xs transition-colors",
        isOver ? "text-primary" : "text-muted-foreground"
      )}>
        Drop here for new row
      </span>
    </div>
  );
}

interface PaneEdgeDropZoneProps {
  paneId: string;
  position: EdgePosition;
  isVisible: boolean;
}

export function PaneEdgeDropZone({ paneId, position, isVisible }: PaneEdgeDropZoneProps) {
  const dropId = `edge-${position}-${paneId}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  if (!isVisible) return null;

  const positionClasses: Record<EdgePosition, string> = {
    left: "left-0 top-0 bottom-0 w-1/4",
    right: "right-0 top-0 bottom-0 w-1/4",
    top: "top-0 left-0 right-0 h-1/4",
    bottom: "bottom-0 left-0 right-0 h-1/4",
  };

  const isHorizontal = position === "left" || position === "right";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute z-10 transition-all duration-150 pointer-events-auto",
        positionClasses[position],
        isOver && "bg-primary/30"
      )}
    >
      {isOver && (
        <div
          className={cn(
            "absolute bg-primary",
            isHorizontal
              ? "w-1 top-2 bottom-2"
              : "h-1 left-2 right-2",
            position === "left" && "left-1",
            position === "right" && "right-1",
            position === "top" && "top-1",
            position === "bottom" && "bottom-1"
          )}
        />
      )}
    </div>
  );
}
