import { cn } from "@/lib/utils";

interface ATListItemProps {
  children: React.ReactNode;
  /** Right-aligned action buttons */
  actions?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * List item with consistent styling used for profiles, layouts, etc.
 * Supports right-aligned action buttons.
 */
export function ATListItem({ children, actions, className, onClick }: ATListItemProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      className={cn(
        "flex justify-between items-center px-3 py-2.5 bg-muted rounded-md border border-border w-full text-left",
        onClick && "cursor-pointer hover:border-muted-foreground/30 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {children}
      </div>
      {actions && (
        <div className="flex gap-1.5 shrink-0 ml-2">
          {actions}
        </div>
      )}
    </Component>
  );
}

interface ATListItemContentProps {
  title: string;
  subtitle?: string;
  /** Optional left icon/color dot */
  icon?: React.ReactNode;
}

/**
 * Standard content layout for list items with title, subtitle, and optional icon.
 */
export function ATListItemContent({ title, subtitle, icon }: ATListItemContentProps) {
  return (
    <>
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </>
  );
}
