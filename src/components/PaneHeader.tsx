import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  accentColor?: string;
  isFocused?: boolean;
  canClose?: boolean;
  onClose?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  titleExtra?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PaneHeader({
  title,
  subtitle,
  accentColor,
  isFocused,
  canClose,
  onClose,
  dragHandleProps,
  titleExtra,
  actions,
}: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 border-b border-border cursor-grab shrink-0 transition-colors",
        isFocused ? "bg-accent" : "bg-secondary"
      )}
      {...dragHandleProps}
    >
      <div className="flex items-center gap-2">
        {accentColor && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
        )}
        <span className="text-xs font-medium text-foreground">{title}</span>
        {titleExtra}
      </div>
      <div className="flex items-center gap-2">
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
        {actions}
        {canClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 opacity-60 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            title="Close pane"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
