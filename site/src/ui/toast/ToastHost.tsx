import { useToastState } from "./ToastProvider";
import "./ToastHost.css";

/**
 * Renders the polite, non-focus-stealing live region that announces toast
 * confirmations to assistive technology, styled as a centred-bottom pill per
 * design-ref/08-palette-and-toast.html.
 *
 * Must be mounted exactly once, inside a `ToastProvider`, composed at the
 * app root. The live region itself is always present in the DOM — even with
 * no active toast — so screen readers pick up the announcement when content
 * is later written into it. Creating the region and its content in the same
 * render would risk the announcement being missed. The visible pill is
 * rendered only while a message exists.
 *
 * The `toast-host-pop` keyframes below are neutralised globally by
 * `src/styles/motion.css` under `prefers-reduced-motion: reduce`.
 */
export function ToastHost() {
  const state = useToastState();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="toast-host"
      className="toast-host"
    >
      {state ? (
        <div className="toast-host__pill">
          <span className="toast-host__check" aria-hidden="true">
            ✓
          </span>
          <span className="toast-host__message">{state.message}</span>
        </div>
      ) : null}
    </div>
  );
}
