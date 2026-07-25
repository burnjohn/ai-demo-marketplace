/**
 * Getting Started view — an ordered sequence of numbered steps, each
 * with its own copy control, whose commands are generated from the
 * catalog's own identity rather than hard-coded.
 *
 * The catalog index is provided via props, matching the `{ index:
 * CatalogIndex }` shape used by `HomeView` and `WhatsNewView`.
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import type { CatalogIndex } from "../../catalog/types";
import { CopyControl } from "../../ui/copy";
import { buildRouteHref } from "../../routing/paths";
import { useRouter } from "../../routing/router";
import { t } from "../../i18n";
import "./GettingStartedView.css";

export interface GettingStartedViewProps {
  index: CatalogIndex;
}

interface Step {
  number: number;
  title: string;
  explanation: string;
  command: string;
}

/**
 * Derives every step's command from the catalog's own identity — the
 * marketplace's registered name (`index.marketplaceName`) and a real plugin
 * name from the index — never a hard-coded literal, so a rebuild after
 * renaming the marketplace or a plugin changes what's displayed here.
 */
function buildSteps(index: CatalogIndex): Step[] {
  const marketplaceName = index.marketplaceName;
  const samplePlugin = index.plugins[0];
  const pluginName = samplePlugin?.name ?? marketplaceName;

  return [
    {
      number: 1,
      title: t("gettingStarted.step1.title"),
      explanation: t("gettingStarted.step1.explanation"),
      command: `/plugin marketplace add ${marketplaceName}`,
    },
    {
      number: 2,
      title: t("gettingStarted.step2.title"),
      explanation: t("gettingStarted.step2.explanation"),
      command: `/plugin install ${pluginName}@${marketplaceName}`,
    },
    {
      number: 3,
      title: t("gettingStarted.step3.title"),
      explanation: t("gettingStarted.step3.explanation"),
      command: `/plugin update ${pluginName}@${marketplaceName}`,
    },
  ];
}

export function GettingStartedView({ index }: GettingStartedViewProps) {
  const steps = buildSteps(index);
  const { navigate } = useRouter();

  const handleBackToHome = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate({ view: "home" });
  };

  return (
    <main className="page page--getting-started getting-started-view">
      <a
        className="getting-started-view__back"
        href={buildRouteHref({ view: "home" })}
        onClick={handleBackToHome}
      >
        {t("whatsNew.backToHome")}
      </a>
      <h1 id="getting-started-heading" className="getting-started-view__heading">
        {t("title.gettingStarted")}
      </h1>
      <p className="getting-started-view__intro">
        {t("gettingStarted.intro")}
      </p>

      <ol className="getting-started__steps">
        {steps.map((step) => (
          <li key={step.number} className="getting-started__step">
            {/*
              The step number is exposed two ways: visibly as the badge's
              text content (queryable in tests without any hard-coded "Step"
              literal, which the i18n catalogue does not define) and
              implicitly through the
              surrounding `<ol>`'s native list-item position, which assistive
              technology announces on its own.
            */}
            <span className="getting-started__step-number" aria-hidden="true">
              {step.number}
            </span>
            <div className="getting-started__step-body">
              <h2 className="getting-started__step-title">{step.title}</h2>
              <p className="getting-started__step-explanation">{step.explanation}</p>
              <div className="getting-started__command">
                <span className="getting-started__prompt" aria-hidden="true">
                  $
                </span>
                <CopyControl
                  className="getting-started__copy"
                  text={step.command}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="getting-started__update-note">
        <strong>{t("gettingStarted.updateNote.lead")}</strong>{" "}
        {t("gettingStarted.updateNote")}
      </p>
    </main>
  );
}
