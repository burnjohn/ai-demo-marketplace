import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { t } from "../../i18n";
import { useToast } from "../toast";
import { claimSuccess, getActiveSuccessId, releaseSuccess, subscribe } from "./successOwner";
import "./CopyControl.css";

const SUCCESS_DURATION_MS = 2000;

export interface CopyControlProps {
  /** The exact text to write to the clipboard — copied character for character. */
  text: string;
  className?: string;
  /**
   * `"field"` (default) renders the command text beside the button — the
   * mockup's detail-view treatment (`design-ref/04-plugin.html`).
   *
   * `"compact"` renders the button alone, for the result card's footer,
   * where the mockup shows only two 28px buttons and no command text
   * (`design-ref/03-search.html`). The clipboard payload is identical in
   * both variants; only the visible command text differs.
   */
  variant?: "field" | "compact";
  /**
   * Overrides the button's idle label. Pass a resolved message, never a bare
   * literal. Use it where the generic "Copy" reads wrong — an install command
   * is labelled "Copy install" in the mockup, while a plain snippet is not.
   */
  label?: string;
}

/**
 * Reusable copy-to-clipboard control.
 *
 * Renders the command text (always selectable) next to a button that copies
 * it verbatim. On success the button's own label swaps to a success label
 * for ~2s, then reverts; on failure a failure message is shown instead and
 * the success label is never shown. At most one `CopyControl` instance may
 * be in the success state at a time — starting a new copy immediately
 * resets any other control's success state, via the shared `successOwner`
 * store (`./successOwner.ts`).
 */
export function CopyControl({ text, className, variant = "field", label: labelOverride }: CopyControlProps) {
  const id = useId();
  const { showToast } = useToast();
  const [status, setStatus] = useState<"idle" | "success" | "failure">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSuccessId = useSyncExternalStore(subscribe, getActiveSuccessId);

  // Another control just claimed success — release ours immediately.
  useEffect(() => {
    if (status === "success" && activeSuccessId !== id) {
      setStatus("idle");
    }
  }, [activeSuccessId, id, status]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      releaseSuccess(id);
    };
  }, [id]);

  const handleCopy = async () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;

    if (!clipboard || typeof clipboard.writeText !== "function") {
      releaseSuccess(id);
      setStatus("failure");
      return;
    }

    try {
      await clipboard.writeText(text);
    } catch {
      releaseSuccess(id);
      setStatus("failure");
      return;
    }

    claimSuccess(id);
    setStatus("success");
    showToast(t("toast.copySuccess"));
    timeoutRef.current = setTimeout(() => {
      releaseSuccess(id);
      setStatus("idle");
      timeoutRef.current = null;
    }, SUCCESS_DURATION_MS);
  };

  const idleLabel =
    labelOverride ?? (variant === "compact" ? t("copy.installLabel") : t("copy.label"));
  const label = status === "success" ? t("copy.success") : idleLabel;

  return (
    <span
      className={className ? `copy-control ${className}` : "copy-control"}
      data-variant={variant}
    >
      {variant === "field" ? (
        <code
          className="copy-control__text"
          data-testid="copy-control-text"
          style={{ userSelect: "text" }}
        >
          {text}
        </code>
      ) : null}
      <button
        type="button"
        className="copy-control__button"
        data-status={status === "success" ? "success" : undefined}
        onClick={handleCopy}
      >
        {label}
      </button>
      {status === "failure" ? (
        <span role="alert" className="copy-control__failure">
          {t("copy.failure")}
        </span>
      ) : null}
    </span>
  );
}
