import { cn } from "@/lib/utils";

interface ATFormFieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}

/**
 * Form field wrapper with consistent label styling and optional hint text.
 */
export function ATFormField({ label, children, hint, className }: ATFormFieldProps) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[10px] text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}
