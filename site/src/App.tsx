/**
 * Application composition root (T17). Mounts, in order:
 * `RouterProvider` -> `ToastProvider` -> `Shell` -> the routed view, with
 * `ToastHost` and the route announcer's live region mounted exactly once
 * inside the providers, and the catalog index loaded once at the root and
 * handed down through a single read-only context (`app/CatalogIndexContext`).
 *
 * See `app/AppContent.tsx` for the loading/loaded/failed triad and the
 * shell + palette wiring, and `app/RouteView.tsx` for the six-view dispatch
 * plus the per-navigation title/focus/announcement effects.
 */
import { RouterProvider } from "./routing/router";
import { ToastProvider, ToastHost } from "./ui/toast";
import { AnnouncerProvider, AnnouncerRegion } from "./app/Announcer";
import { CatalogIndexProvider } from "./app/CatalogIndexContext";
import { AppContent } from "./app/AppContent";

export function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <AnnouncerProvider>
          <CatalogIndexProvider>
            <AppContent />
          </CatalogIndexProvider>
          <AnnouncerRegion />
        </AnnouncerProvider>
        <ToastHost />
      </ToastProvider>
    </RouterProvider>
  );
}
