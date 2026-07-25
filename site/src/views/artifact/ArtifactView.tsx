/**
 * Artifact detail view — breadcrumb (catalog -> plugin -> artifact), kind
 * badge, display name, description, the owning plugin's install command
 * with a copy control, the invocation token (if declared), the
 * tools/permissions list (if declared) and the documentation body. Matches
 * `design-ref/05-artifact.html`.
 *
 * Resolving the artifact id (and its owning plugin) against the loaded
 * catalog index is this view's own job — the router only validates the URL
 * shape, not whether the id actually exists in the catalog, so a miss here
 * renders the not-found state itself.
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import { EmptyState } from "../../components/EmptyState";
import { KindBadge } from "../../components/KindBadge";
import { MarkdownContent } from "../../components/MarkdownContent";
import type { Artifact, CatalogIndex, Plugin } from "../../catalog/types";
import { buildRouteHref, useRouter } from "../../routing";
import type { NavigateTarget } from "../../routing";
import { CopyControl } from "../../ui/copy";
import { t } from "../../i18n";
import { getRememberedSearchState } from "./searchMemory";
import "./ArtifactView.css";

export interface ArtifactViewProps {
  /** The loaded catalog index. Received via props — this view never loads it itself. */
  index: CatalogIndex;
}

interface ResolvedArtifact {
  plugin: Plugin;
  artifact: Artifact;
}

function resolveArtifact(index: CatalogIndex, artifactId: string): ResolvedArtifact | undefined {
  for (const plugin of index.plugins) {
    const artifact = plugin.artifacts.find((candidate) => candidate.id === artifactId);
    if (artifact) return { plugin, artifact };
  }
  return undefined;
}

/** The artifact detail view. Renders the mockup's regions, or the not-found state on a lookup miss. */
export function ArtifactView({ index }: ArtifactViewProps) {
  const { route, navigate } = useRouter();
  const artifactId = route.view === "artifact" ? route.artifactId : "";
  const resolved = resolveArtifact(index, artifactId);

  const catalogTarget: NavigateTarget = {
    view: "search",
    search: getRememberedSearchState() ?? { kinds: [], keywords: [] },
  };

  if (!resolved) {
    return (
      <EmptyState
        heading={t("state.notFound.artifact")}
        action={
          <a
            href={buildRouteHref(catalogTarget)}
            onClick={(event) => {
              event.preventDefault();
              navigate(catalogTarget);
            }}
          >
            {t("artifact.breadcrumb.catalog")}
          </a>
        }
      />
    );
  }

  const { plugin, artifact } = resolved;
  const pluginTarget: NavigateTarget = { view: "plugin", pluginId: plugin.id };

  function handleBreadcrumbClick(
    event: ReactMouseEvent<HTMLAnchorElement>,
    target: NavigateTarget,
  ) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(target);
  }

  const hasTools = artifact.tools && artifact.tools.length > 0;

  return (
    <main className="page page--artifact artifact-view">
      <nav className="artifact-view__breadcrumb" aria-label={t("artifact.breadcrumb.catalog")}>
        <ol>
          <li>
            <a
              href={buildRouteHref(catalogTarget)}
              onClick={(event) => handleBreadcrumbClick(event, catalogTarget)}
            >
              {t("artifact.breadcrumb.catalog")}
            </a>
          </li>
          <li>
            <a
              href={buildRouteHref(pluginTarget)}
              onClick={(event) => handleBreadcrumbClick(event, pluginTarget)}
            >
              {t("artifact.breadcrumb.plugin", { pluginName: plugin.displayName })}
            </a>
          </li>
          <li aria-current="page">{artifact.displayName}</li>
        </ol>
      </nav>

      <header className="artifact-view__header">
        <div className="artifact-view__title-row">
          <KindBadge kind={artifact.kind} />
          <h1 className="artifact-view__title">{artifact.displayName}</h1>
          {artifact.invocationToken ? (
            <span
              className="artifact-view__invocation-token"
              aria-label={t("artifact.invocation.heading")}
            >
              {artifact.invocationToken}
            </span>
          ) : null}
        </div>
        {artifact.description ? (
          <p className="artifact-view__description">{artifact.description}</p>
        ) : null}
      </header>

      {hasTools ? (
        <section className="artifact-view__tools" aria-labelledby="artifact-tools-heading">
          <h2 id="artifact-tools-heading" className="artifact-view__tools-heading">
            {t("artifact.tools.heading")}
          </h2>
          <ul className="artifact-view__tools-list">
            {artifact.tools!.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="artifact-view__install" aria-label={t("artifact.installExplanation")}>
        <CopyControl
          className="artifact-view__install-copy"
          text={plugin.installCommand.text}
          variant="field"
          label={t("copy.installLabel")}
        />
      </section>

      <section className="artifact-view__documentation" aria-labelledby="artifact-documentation-heading">
        <h2 id="artifact-documentation-heading" className="artifact-view__section-heading">
          {t("artifact.documentation.heading")}
        </h2>
        <div className="artifact-view__prose-card">
          {artifact.documentationExcerpt ? (
            <MarkdownContent markdown={artifact.documentationExcerpt} />
          ) : (
            <>
              <p className="artifact-view__prose-placeholder">
                {t("artifact.documentation.placeholder")}
              </p>
              <a href={artifact.sourceUrl} target="_blank" rel="noopener noreferrer">
                {artifact.sourceUrl}
              </a>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
