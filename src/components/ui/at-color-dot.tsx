import { cn } from "@/lib/utils";

interface ATColorDotProps {
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

/**
 * Color indicator dot used for profiles, panes, projects, etc.
 */
export function ATColorDot({ color, size = "md", className }: ATColorDotProps) {
  return (
    <span
      className={cn("rounded-full shrink-0", sizeClasses[size], className)}
      style={{ backgroundColor: color }}
    />
  );
}
