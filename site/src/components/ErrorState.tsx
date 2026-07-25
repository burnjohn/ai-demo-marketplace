import { t } from "../i18n";
import "./components.css";

export interface ErrorStateProps {
  /** Already-translated message describing what went wrong. */
  message: string;
  onRetry: () => void;
  repositoryUrl: string;
  className?: string;
}

/** Error surface: message + retry action + a link back to the repository. */
export function ErrorState({ message, onRetry, repositoryUrl, className }: ErrorStateProps) {
  return (
    <div className={className ? `error-state ${className}` : "error-state"} role="alert">
      <h2>{t("state.error.heading")}</h2>
      <p>{message}</p>
      <div className="error-state__actions">
        <button type="button" onClick={onRetry}>
          {t("state.error.retry")}
        </button>
        <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
          {t("shell.repoLink.label")}
        </a>
      </div>
    </div>
  );
}
