import { t } from "../i18n";
import "./components.css";

export interface VersionBadgeProps {
  /** Absent/undefined renders the neutral placeholder — never an empty pill. */
  version?: string;
  className?: string;
}

/**
 * Renders the version, or — when absent — a neutral, visible placeholder
 * sourced from the message catalogue. Never renders an empty coloured pill:
 * the placeholder state carries its own visible text and a distinct
 * `data-placeholder` flag rather than an empty background swatch.
 */
export function VersionBadge({ version, className }: VersionBadgeProps) {
  const classes = className ? `version-badge ${className}` : "version-badge";
  if (!version) {
    return (
      <span className={classes} data-placeholder="true">
        {t("version.placeholder")}
      </span>
    );
  }
  return (
    <span className={classes} data-placeholder="false">
      v{version}
    </span>
  );
}
