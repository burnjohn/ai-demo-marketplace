import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/**
 * Imperative surface for showing transient toast confirmations.
 *
 * `showToast` enqueues a message to be announced via the polite live region
 * rendered by `ToastHost`. Consumers never touch the DOM directly.
 */
export interface ToastContextValue {
  showToast: (message: string) => void;
}

interface ToastState {
  message: string;
  /** Bumped on every call so the live region text changes even when the
   * announced message text is identical to the previous one, which is
   * common for copy confirmations ("Copied" every time). */
  sequence: number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Internal context used only by `ToastHost` to read the current toast state. */
const ToastStateContext = createContext<ToastState | null>(null);

const TOAST_DURATION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState | null>(null);
  const sequenceRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    sequenceRef.current += 1;
    setState({ message, sequence: sequenceRef.current });
    timeoutRef.current = setTimeout(() => {
      setState(null);
      timeoutRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastStateContext.Provider value={state}>{children}</ToastStateContext.Provider>
    </ToastContext.Provider>
  );
}

/** Hook used by the copy control (and any future feature) to trigger a toast. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

/** Internal — read by `ToastHost` only. */
export function useToastState(): ToastState | null {
  return useContext(ToastStateContext);
}
