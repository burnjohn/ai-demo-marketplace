/**
 * Plugin detail view — display name, version/compatibility badges,
 * description, author, last-updated stamp, install command with a copy
 * control, source link, artifact composition grouped by kind, dependencies,
 * README and changelog. Matches `design-ref/04-plugin.html`.
 *
 * The catalog index is provided via props — this view never loads the
 * catalog itself. Whether `pluginId` resolves inside that index is this
 * view's job (not the router's, see `routing/types.ts` `NotFoundReason`):
 * a miss renders an inline not-found state rather than throwing or
 * rendering an empty page.
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import type { Artifact, ArtifactKind, ChangelogEntry, CatalogIndex, Dependency, Plugin } from "../../catalog/types";
import { buildRouteHref } from "../../routing/paths";
import { useRouter } from "../../routing/router";
import type { NavigateTarget } from "../../routing/types";
import { VersionBadge } from "../../components/VersionBadge";
import { EmptyState } from "../../components/EmptyState";
import { MarkdownContent } from "../../components/MarkdownContent";
import { CopyControl } from "../../ui/copy";
import { formatDate, t } from "../../i18n";
import { resolveBackTarget } from "./backProvenance";
import "./PluginView.css";

export interface PluginViewProps {
  /** The loaded catalog index. Received via props — never loaded here. */
  index: CatalogIndex;
}

/** Stable, fixed display order for artifact groups — matches the facet order used elsewhere. */
const KIND_ORDER: readonly ArtifactKind[] = ["skill", "agent", "command", "hook", "mcp"];

/** Mapping from artifact kind to its i18n label key. */
const KIND_LABEL_KEY = {
  skill: "kind.label.skill",
  agent: "kind.label.agent",
  command: "kind.label.command",
  hook: "kind.label.hook",
  mcp: "kind.label.mcp",
} as const;

const CONTRIBUTION_GUIDELINES_URL =
  "https://github.com/burnjohn/ai-demo-marketplace/blob/main/docs/PLUGIN-GUIDELINES.md";

interface DatedChangelogEntry extends ChangelogEntry {
  parsedDate: Date | null;
}

/** Parses a changelog date, treating anything unparseable the same as absent. */
function parseEntryDate(date: string | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Newest-first for dated entries; every undated (or unparseably dated) entry sorts after them. */
function sortChangelog(entries: ChangelogEntry[]): DatedChangelogEntry[] {
  const withParsedDates = entries.map((entry) => ({ ...entry, parsedDate: parseEntryDate(entry.date) }));
  const dated = withParsedDates
    .filter((entry) => entry.parsedDate !== null)
    .sort((a, b) => b.parsedDate!.getTime() - a.parsedDate!.getTime());
  const undated = withParsedDates.filter((entry) => entry.parsedDate === null);
  return [...dated, ...undated];
}

/** Groups a plugin's artifacts by kind in `KIND_ORDER`, omitting kinds it ships none of. */
function groupArtifactsByKind(artifacts: Artifact[]): Array<{ kind: ArtifactKind; items: Artifact[] }> {
  return KIND_ORDER.map((kind) => ({ kind, items: artifacts.filter((artifact) => artifact.kind === kind) })).filter(
    (group) => group.items.length > 0,
  );
}

/** A link that navigates through the SPA router rather than a full document reload. */
function RouterLink({
  target,
  className,
  children,
}: {
  target: NavigateTarget;
  className?: string;
  children: React.ReactNode;
}) {
  const { navigate } = useRouter();
  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(target);
  };
  return (
    <a className={className} href={buildRouteHref(target)} onClick={handleClick}>
      {children}
    </a>
  );
}

function BackControl() {
  const target = resolveBackTarget();
  return (
    <RouterLink target={target} className="plugin-view__back">
      {t("plugin.back")}
    </RouterLink>
  );
}

/** Small header row for one artifact-kind group: coloured dot + label + count. */
function KindGroupHeader({ kind, count }: { kind: ArtifactKind; count: number }) {
  return (
    <h3 className="plugin-view__group-heading">
      <span
        className="plugin-view__kind-dot"
        data-kind={kind}
        aria-hidden="true"
      />
      <span className="plugin-view__kind-label">{t(KIND_LABEL_KEY[kind])}</span>
      <span className="plugin-view__kind-count">
        {t("plugin.artifactGroup.count", { count })}
      </span>
    </h3>
  );
}

/** One artifact card inside a kind group — name + invocation token + description. */
function ArtifactCard({ artifact }: { artifact: Artifact }) {
  return (
    <li className="plugin-view__artifact-item">
      <RouterLink
        className="plugin-view__artifact-link"
        target={{ view: "artifact", artifactId: artifact.id }}
      >
        <span className="plugin-view__artifact-top">
          <span className="plugin-view__artifact-name">{artifact.displayName}</span>
          {artifact.invocationToken ? (
            <span className="plugin-view__artifact-invocation">{artifact.invocationToken}</span>
          ) : null}
        </span>
        {artifact.description ? (
          <span className="plugin-view__artifact-description">{artifact.description}</span>
        ) : null}
      </RouterLink>
    </li>
  );
}

function ArtifactGroups({ artifacts }: { artifacts: Artifact[] }) {
  const groups = groupArtifactsByKind(artifacts);
  if (groups.length === 0) return null;

  return (
    <section className="plugin-view__section plugin-view__section--contents" aria-labelledby="plugin-artifacts-heading">
      <h2 id="plugin-artifacts-heading" className="plugin-view__section-heading">
        {t("plugin.section.artifacts")}
      </h2>
      <div className="plugin-view__groups">
        {groups.map((group) => (
          <div className="plugin-view__artifact-group" key={group.kind}>
            <KindGroupHeader kind={group.kind} count={group.items.length} />
            <ul className="plugin-view__artifact-list">
              {group.items.map((artifact) => (
                <ArtifactCard artifact={artifact} key={artifact.id} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function DependencyList({ dependencies, index }: { dependencies: Dependency[] | undefined; index: CatalogIndex }) {
  if (!dependencies || dependencies.length === 0) return null;

  return (
    <section className="plugin-view__section" aria-labelledby="plugin-dependencies-heading">
      <h2 id="plugin-dependencies-heading" className="plugin-view__section-heading">
        {t("plugin.section.dependencies")}
      </h2>
      <ul className="plugin-view__dep-list">
        {dependencies.map((dependency) => {
          const resolvedPlugin = dependency.resolvesWithinCatalog
            ? index.plugins.find((candidate) => candidate.id === dependency.name)
            : undefined;
          return (
            <li key={dependency.name} className="plugin-view__dep-item">
              {resolvedPlugin ? (
                <RouterLink
                  className="plugin-view__dep-chip"
                  target={{ view: "plugin", pluginId: resolvedPlugin.id }}
                >
                  {dependency.name}
                </RouterLink>
              ) : (
                <span className="plugin-view__dep-chip plugin-view__dep-chip--external">
                  {dependency.name}
                </span>
              )}
              {dependency.versionRange ? (
                <span className="plugin-view__dependency-range">{dependency.versionRange}</span>
              ) : null}
              {!resolvedPlugin ? (
                <span className="plugin-view__dependency-external">{t("plugin.dependency.external")}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReadmeSection({ readme }: { readme: string | undefined }) {
  return (
    <section className="plugin-view__section" aria-labelledby="plugin-readme-heading">
      <h2 id="plugin-readme-heading" className="plugin-view__section-heading">
        {t("plugin.section.readme")}
      </h2>
      <div className="plugin-view__prose-card">
        {readme ? (
          <MarkdownContent markdown={readme} />
        ) : (
          <p className="plugin-view__prose-placeholder">
            {t("plugin.readme.placeholder")}{" "}
            <a href={CONTRIBUTION_GUIDELINES_URL} target="_blank" rel="noopener noreferrer">
              {t("home.emptyCatalog.contributionLink")}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

function ChangelogSection({ entries }: { entries: ChangelogEntry[] | undefined }) {
  const sorted = entries && entries.length > 0 ? sortChangelog(entries) : [];

  return (
    <section className="plugin-view__section" aria-labelledby="plugin-changelog-heading">
      <h2 id="plugin-changelog-heading" className="plugin-view__section-heading">
        {t("plugin.section.changelog")}
      </h2>
      {sorted.length === 0 ? (
        <p className="plugin-view__prose-placeholder">{t("plugin.changelog.placeholder")}</p>
      ) : (
        <ul className="plugin-view__changelog-list">
          {sorted.map((entry, entryIndex) => (
            <li className="plugin-view__changelog-entry" key={`${entry.version}-${entryIndex}`}>
              <div className="plugin-view__changelog-heading">
                <VersionBadge className="plugin-view__changelog-version" version={entry.version} />
                {entry.parsedDate ? (
                  <time className="plugin-view__changelog-date" dateTime={entry.date}>
                    {formatDate(entry.parsedDate)}
                  </time>
                ) : null}
              </div>
              <div className="plugin-view__changelog-summary">{entry.summary}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PluginNotFound() {
  return (
    <main className="page page--plugin plugin-view plugin-view__not-found">
      <EmptyState
        heading={t("state.notFound.plugin")}
        action={<RouterLink target={{ view: "home" }}>{t("whatsNew.backToHome")}</RouterLink>}
      />
    </main>
  );
}

export function PluginView({ index }: PluginViewProps) {
  const { route } = useRouter();
  const pluginId = route.view === "plugin" ? route.pluginId : undefined;
  const plugin: Plugin | undefined = pluginId
    ? index.plugins.find((candidate) => candidate.id === pluginId)
    : undefined;

  if (!plugin) {
    return <PluginNotFound />;
  }

  const lastUpdated = plugin.lastUpdated ? parseEntryDate(plugin.lastUpdated) : null;
  const formattedUpdated = lastUpdated ? formatDate(lastUpdated) : null;

  return (
    <main className="page page--plugin plugin-view">
      <BackControl />

      <header className="plugin-view__header">
        <div className="plugin-view__avatar" aria-hidden="true">
          ◆
        </div>
        <div className="plugin-view__header-body">
          <div className="plugin-view__title-row">
            <h1 className="plugin-view__title">{plugin.displayName}</h1>
            <VersionBadge className="plugin-view__version" version={plugin.version} />
            {plugin.compatibility ? (
              <span className="plugin-view__compatibility">{plugin.compatibility}</span>
            ) : null}
          </div>
          {plugin.description ? (
            <p className="plugin-view__description">{plugin.description}</p>
          ) : null}
          {(plugin.authorName || formattedUpdated) && (
            <div className="plugin-view__meta">
              {plugin.authorName && formattedUpdated ? (
                <>
                  <span>{plugin.authorName}</span>
                  <span aria-hidden="true"> · </span>
                  <time dateTime={plugin.lastUpdated}>
                    {t("plugin.updated", { date: formattedUpdated })}
                  </time>
                </>
              ) : plugin.authorName ? (
                <span>{plugin.authorName}</span>
              ) : formattedUpdated ? (
                <time dateTime={plugin.lastUpdated}>
                  {t("plugin.updated", { date: formattedUpdated })}
                </time>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <section className="plugin-view__install" aria-label={t("plugin.section.readme")}>
        <CopyControl
          className="plugin-view__install-copy"
          text={plugin.installCommand.text}
          variant="field"
          label={t("copy.installLabel")}
        />
        <a
          className="plugin-view__source-link"
          href={plugin.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("shell.repoLink.label")}
        >
          {t("plugin.sourceLink.label")}
        </a>
      </section>

      <ArtifactGroups artifacts={plugin.artifacts} />
      <DependencyList dependencies={plugin.dependencies} index={index} />
      <ReadmeSection readme={plugin.readme} />
      <ChangelogSection entries={plugin.changelogEntries} />
    </main>
  );
}
