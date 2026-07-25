import type { ReactNode } from "react";
import "./components.css";

export interface EmptyStateProps {
  heading: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Generic "nothing here" surface — callers supply already-translated copy. */
export function EmptyState({ heading, description, action, className }: EmptyStateProps) {
  return (
    <div className={className ? `empty-state ${className}` : "empty-state"} role="status">
      <h2>{heading}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="empty-state__actions">{action}</div> : null}
    </div>
  );
}
