import "./components.css";

export interface SkeletonProps {
  /** Which layout box to reserve. */
  variant?: "card" | "text" | "block";
  /** Renders this many skeleton boxes in a row (a loading grid, for example). */
  count?: number;
  className?: string;
}

/**
 * Layout-reserving placeholder shown while the catalog index has not yet
 * loaded. Each variant occupies the same box the real content will take,
 * so hydration does not shift layout.
 */
export function Skeleton({ variant = "block", count = 1, className }: SkeletonProps) {
  const classes = className
    ? `skeleton skeleton--${variant} ${className}`
    : `skeleton skeleton--${variant}`;
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={classes} aria-hidden="true" />
      ))}
    </>
  );
}
