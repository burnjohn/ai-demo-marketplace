import type { ArtifactKind } from "../catalog/types";
import { t } from "../i18n";
import "./components.css";

/** Every kind a badge may represent — the five artifact kinds plus "plugin" itself. */
export type BadgeKind = ArtifactKind | "plugin";

/** Maps each kind to its message-catalogue label key. */
const KIND_LABEL_KEYS = {
  plugin: "kind.label.plugin",
  skill: "kind.label.skill",
  agent: "kind.label.agent",
  command: "kind.label.command",
  hook: "kind.label.hook",
  mcp: "kind.label.mcp",
} as const satisfies Record<BadgeKind, Parameters<typeof t>[0]>;

export interface KindBadgeProps {
  kind: BadgeKind;
  className?: string;
}

/**
 * Renders a kind as a coloured pill *and* a text label — the colour alone
 * never carries the meaning, so the kind stays identifiable in greyscale or
 * to a colour-blind reader. The label comes from the message catalogue
 * exclusively — no literal string.
 */
export function KindBadge({ kind, className }: KindBadgeProps) {
  return (
    <span
      className={className ? `kind-badge ${className}` : "kind-badge"}
      data-kind={kind}
    >
      {t(KIND_LABEL_KEYS[kind])}
    </span>
  );
}
