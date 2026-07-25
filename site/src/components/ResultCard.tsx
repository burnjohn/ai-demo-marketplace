import type { ReactNode, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type { SearchEntity } from "../catalog/search";
import { buildRouteHref } from "../routing/paths";
import { useRouter } from "../routing";
import type { NavigateTarget } from "../routing";
import { t } from "../i18n";
import { KindBadge } from "./KindBadge";
import { VersionBadge } from "./VersionBadge";
import "./components.css";

export interface ResultCardProps {
  entity: SearchEntity;
  /**
   * Renders the copy-install control for this card.
   *
   * The real copy-button component lives in `src/ui/copy` and is injected
   * as a render prop so the card stays a pure presentational primitive.
   * Callers pass their exported copy-button, e.g.
   * `renderCopyControl={(text) => <CopyButton text={text} />}`.
   *
   * Must render exactly one focusable control (a single `<button>`), so the
   * card keeps its two-Tab-stop contract alongside the accent "Open" link
   * in the footer.
   */
  renderCopyControl: (installText: string) => ReactNode;
  className?: string;
}

function entityFields(entity: SearchEntity) {
  if (entity.entityType === "plugin") {
    const { plugin } = entity;
    const target: NavigateTarget = { view: "plugin", pluginId: plugin.id };
    return {
      kind: "plugin" as const,
      version: plugin.version,
      displayName: plugin.displayName,
      description: plugin.description || undefined,
      keywords: plugin.keywords ?? [],
      pluginId: plugin.id,
      metaAuthor: plugin.authorName,
      installText: plugin.installCommand.text,
      target,
      href: buildRouteHref(target),
    };
  }
  const { plugin, artifact } = entity;
  const target: NavigateTarget = { view: "artifact", artifactId: artifact.id };
  return {
    kind: artifact.kind,
    version: plugin.version,
    displayName: artifact.displayName,
    description: artifact.description,
    keywords: plugin.keywords ?? [],
    pluginId: plugin.id,
    metaAuthor: plugin.authorName,
    installText: plugin.installCommand.text,
    target,
    href: buildRouteHref(target),
  };
}

/**
 * A single search/browse result — plugin or artifact — rendered as a card.
 *
 * Accessibility contract: the card exposes exactly two Tab stops — the
 * primary accent "Open" link in the footer (whose accessible name embeds
 * the entity's display name so screen readers hear "Open ‹display name›"),
 * and the copy-install control. Clicking anywhere else on the card body
 * (including the visible display-name heading) is delegated to the same
 * navigation the Open link performs, so pointer and keyboard reach the
 * same detail view without a nested-interactive a11y trap.
 */
export function ResultCard({ entity, renderCopyControl, className }: ResultCardProps) {
  const router = useRouter();
  const fields = entityFields(entity);
  const keywords = fields.keywords.slice(0, 3);

  const handleCardClick = (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    // Let the Open link and the copy control handle their own activation;
    // clicks that land elsewhere on the card are re-routed to navigation.
    if (target.closest("a,button")) return;
    event.preventDefault();
    router.navigate(fields.target);
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a,button")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.navigate(fields.target);
    }
  };

  // The Open link carries a real `href` (so middle-click / Ctrl-click /
  // "open in new tab" and the plain accessible-name/href contract keep
  // working), but a plain left click is routed through the SPA router
  // rather than left to the browser's native hash navigation — the router
  // only synchronises state via `pushState`/`popstate` (see `router.tsx`),
  // not `hashchange`.
  const handleOpenClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.navigate(fields.target);
  };

  return (
    <article
      className={className ? `result-card ${className}` : "result-card"}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="result-card__body">
        <div className="result-card__top">
          <KindBadge kind={fields.kind} />
          <VersionBadge version={fields.version} />
        </div>
        <h3 className="result-card__title">{fields.displayName}</h3>
        {fields.description ? (
          <p className="result-card__description">{fields.description}</p>
        ) : null}
        {keywords.length > 0 ? (
          <ul className="result-card__keywords">
            {keywords.map((keyword) => (
              <li key={keyword} className="result-card__keyword">
                {keyword}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="result-card__footer">
        <p className="result-card__meta">
          <span className="result-card__meta-plugin">{fields.pluginId}</span>
          {fields.metaAuthor ? (
            <>
              <span className="result-card__meta-sep" aria-hidden="true">
                {" · "}
              </span>
              <span className="result-card__meta-author">{fields.metaAuthor}</span>
            </>
          ) : null}
        </p>
        <div className="result-card__actions">
          {renderCopyControl(fields.installText)}
          <a
            className="result-card__open"
            href={fields.href}
            onClick={handleOpenClick}
            aria-label={t("card.open", { name: fields.displayName })}
          >
            {t("card.openLabel")}
          </a>
        </div>
      </div>
    </article>
  );
}
