import { cn } from "@/lib/utils";

interface ATSectionHeaderProps {
  children: React.ReactNode;
  className?: string;
  /** Right-aligned action buttons */
  actions?: React.ReactNode;
}

/**
 * Section header with uppercase styling used throughout settings and panels.
 * Optionally includes right-aligned action buttons.
 */
export function ATSectionHeader({ children, className, actions }: ATSectionHeaderProps) {
  if (actions) {
    return (
      <div className="flex justify-between items-center mb-3">
        <h3 className={cn(
          "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider",
          className
        )}>
          {children}
        </h3>
        <div className="flex gap-1.5">
          {actions}
        </div>
      </div>
    );
  }

  return (
    <h3 className={cn(
      "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3",
      className
    )}>
      {children}
    </h3>
  );
}
