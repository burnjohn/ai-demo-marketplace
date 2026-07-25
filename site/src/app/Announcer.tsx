/**
 * Route-change announcer: a single, always-present `aria-live` region that
 * assistive technology has already discovered before the first
 * announcement is written into it. `AnnouncerRegion` must be mounted exactly
 * once and never unmounted/remounted across navigations — recreating the
 * live region is exactly how screen readers miss the announcement (see the
 * same constraint documented on `../ui/toast/ToastHost.tsx`).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./app.css";

export interface AnnouncerContextValue {
  announce: (message: string) => void;
}

interface AnnouncementState {
  message: string;
  /** Bumped on every call so identical consecutive messages still re-render
   * the region's text (a screen reader needs a change to notice). */
  sequence: number;
}

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);
const AnnouncerStateContext = createContext<AnnouncementState | null>(null);

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnnouncementState | null>(null);
  const sequenceRef = useRef(0);

  const announce = useCallback((message: string) => {
    sequenceRef.current += 1;
    setState({ message, sequence: sequenceRef.current });
  }, []);

  const value = useMemo<AnnouncerContextValue>(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      <AnnouncerStateContext.Provider value={state}>{children}</AnnouncerStateContext.Provider>
    </AnnouncerContext.Provider>
  );
}

/** Hook used to announce a route change (or any other AT-relevant update). */
export function useAnnouncer(): AnnouncerContextValue {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error("useAnnouncer must be used within an AnnouncerProvider");
  }
  return context;
}

/** Internal — read by `AnnouncerRegion` only. */
function useAnnouncerState(): AnnouncementState | null {
  return useContext(AnnouncerStateContext);
}

/**
 * Renders the persistent, visually-hidden `aria-live="assertive"` region.
 * Mount exactly once, inside `AnnouncerProvider`, alongside (not inside) the
 * routed content so it survives every route change unchanged.
 */
export function AnnouncerRegion() {
  const state = useAnnouncerState();

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      data-testid="route-announcer"
      className="app-visually-hidden"
    >
      {state ? state.message : ""}
    </div>
  );
}
