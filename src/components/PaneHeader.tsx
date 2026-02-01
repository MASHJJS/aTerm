import { useState } from "react";

interface Props {
  title: string;
  subtitle?: string;
  accentColor?: string;
  isFocused?: boolean;
  canClose?: boolean;
  onClose?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  titleExtra?: React.ReactNode;  // Content after title (e.g., branch badge)
  actions?: React.ReactNode;     // Action buttons before close button
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
  const [closeHovered, setCloseHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.header,
        ...(isFocused ? { backgroundColor: "var(--bg-tertiary)" } : {}),
      }}
      {...dragHandleProps}
    >
      <div style={styles.titleRow}>
        {accentColor && <span style={{ ...styles.indicator, backgroundColor: accentColor }} />}
        <span style={styles.title}>{title}</span>
        {titleExtra}
      </div>
      <div style={styles.headerRight}>
        {subtitle && <span style={styles.subtitle}>{subtitle}</span>}
        {actions}
        {canClose && (
          <button
            style={{
              ...styles.closeButton,
              ...(closeHovered ? { opacity: 1, backgroundColor: "var(--bg-tertiary)" } : {}),
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            title="Close pane"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: "8px 12px",
    backgroundColor: "var(--bg-secondary)",
    borderBottom: "1px solid var(--border-subtle)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
    cursor: "grab",
    transition: "background-color 0.15s ease",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  indicator: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  title: {
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--text)",
  },
  subtitle: {
    fontSize: "11px",
    color: "var(--text-subtle)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  closeButton: {
    width: "18px",
    height: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "4px",
    color: "var(--text-muted)",
    fontSize: "16px",
    cursor: "pointer",
    opacity: 0.6,
    transition: "opacity 0.15s ease, background-color 0.15s ease",
  },
};
