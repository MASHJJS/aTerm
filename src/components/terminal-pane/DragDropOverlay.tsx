interface DragDropOverlayProps {
  isVisible: boolean;
}

/**
 * Overlay shown when dragging files over the terminal pane
 */
export function DragDropOverlay({ isVisible }: DragDropOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-primary/10 pointer-events-none flex items-center justify-center z-10">
      <div className="bg-background/90 border border-primary rounded-lg px-4 py-3 text-center shadow-lg">
        <p className="text-sm font-medium">Drop to insert path</p>
      </div>
    </div>
  );
}
