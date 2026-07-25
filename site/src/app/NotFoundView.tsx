/**
 * Not-found state for routes the router itself could not resolve
 * (`RouteState` with `view: "not-found"` — see
 * `../routing/types.ts`'s `NotFoundReason`). Names what specifically was not
 * found and offers routes out to home and search.
 *
 * This is distinct from the inline not-found states `PluginView`/`ArtifactView`
 * render themselves when a syntactically valid id simply does not resolve in
 * the loaded index — that is those views' own job (see their file headers).
 * This component only handles the router-level case (e.g. an unrecognised
 * path, or a `#/plugin/`/`#/artifact/` with no id segment at all).
 */
import type { MouseEvent as ReactMouseEvent } from "react";
import { t } from "../i18n";
import { buildRouteHref } from "../routing/paths";
import { useRouter } from "../routing/router";
import type { NavigateTarget, NotFoundReason } from "../routing/types";
import "./app.css";

export interface NotFoundViewProps {
  reason: NotFoundReason;
}

const REASON_MESSAGE_KEY = {
  "unknown-view": "state.notFound.view",
  "unknown-plugin": "state.notFound.plugin",
  "unknown-artifact": "state.notFound.artifact",
} as const satisfies Record<NotFoundReason, "state.notFound.view" | "state.notFound.plugin" | "state.notFound.artifact">;

export function NotFoundView({ reason }: NotFoundViewProps) {
  const { navigate } = useRouter();

  const handleNavigate = (target: NavigateTarget) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(target);
  };

  return (
    <main className="page app-not-found">
      <h1>{t(REASON_MESSAGE_KEY[reason])}</h1>
      <p>
        <a href={buildRouteHref({ view: "home" })} onClick={handleNavigate({ view: "home" })}>
          {t("whatsNew.backToHome")}
        </a>
      </p>
      <p>
        <a href={buildRouteHref({ view: "search" })} onClick={handleNavigate({ view: "search" })}>
          {t("search.heading.browse")}
        </a>
      </p>
    </main>
  );
}
