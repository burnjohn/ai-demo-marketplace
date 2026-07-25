/**
 * Command palette overlay. An imperative-handle-driven overlay, NOT a
 * route — its open/closed state never touches `location.hash` or history.
 * The shell's header trigger and the global keyboard shortcut both drive
 * the same `open()` call, so they produce identical state.
 *
 * Mounting contract: render `<CommandPalette ref={paletteRef}
 * index={loadedIndexOrNull} />` once, near the app root (sibling of the
 * routed views, not inside them), and wire the shell's `onOpenPalette` to
 * `paletteRef.current?.open()`. The component owns the Cmd/Ctrl+K listener
 * itself, so it opens from every view without any per-view wiring.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import type { CatalogIndex } from "../catalog/types";
import { flattenEntities, searchEntities, type SearchEntity } from "../catalog/search";
import type { NavigateTarget } from "../routing/types";
import { useRouter } from "../routing";
import { t } from "../i18n";
import "./CommandPalette.css";

/** Imperative open/close API. The shell's `onOpenPalette` callback drives `open()`. */
export interface CommandPaletteHandle {
  open: () => void;
  close: () => void;
}

export interface CommandPaletteProps {
  /**
   * The loaded catalog index, or `null` while loading/failed. A `null` index
   * and an index with zero plugins both render the "nothing to search"
   * state — the palette does not distinguish "failed" from "empty"
   * for its own purposes; the shell/app surfaces the distinction elsewhere.
   */
  index: CatalogIndex | null;
}

const MAX_RESULTS = 8;

function entityDisplayName(entity: SearchEntity): string {
  return entity.entityType === "plugin"
    ? entity.plugin.displayName
    : entity.artifact.displayName;
}

function entityTarget(entity: SearchEntity): NavigateTarget {
  return entity.entityType === "plugin"
    ? { view: "plugin", pluginId: entity.plugin.id }
    : { view: "artifact", artifactId: entity.artifact.id };
}

function entityKey(entity: SearchEntity): string {
  return entity.entityType === "plugin" ? `plugin:${entity.plugin.id}` : `artifact:${entity.artifact.id}`;
}

function entityKindForBadge(entity: SearchEntity): PaletteKind {
  return entity.entityType === "plugin" ? "plugin" : entity.artifact.kind;
}

/**
 * Detects the platform modifier from the event itself — `metaKey` (Cmd) or
 * `ctrlKey` (Ctrl) — never from a user-agent string, per the task's gotcha.
 * Either modifier is accepted so the same code works cross-platform without
 * guessing the OS.
 */
function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K");
}

const KIND_LABEL_KEYS = {
  plugin: "kind.label.plugin",
  skill: "kind.label.skill",
  agent: "kind.label.agent",
  command: "kind.label.command",
  hook: "kind.label.hook",
  mcp: "kind.label.mcp",
} as const;

type PaletteKind = keyof typeof KIND_LABEL_KEYS;

/**
 * Command palette overlay. Renders nothing while closed. While open, renders
 * a backdrop + dialog via a portal appended to `document.body`, so it always
 * sits above the routed view regardless of where it is mounted in the tree.
 */
export const CommandPalette = forwardRef<CommandPaletteHandle, CommandPaletteProps>(
  function CommandPalette({ index }, ref) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLUListElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);
    const inertedSiblingsRef = useRef<Element[]>([]);

    const entities = useMemo(() => (index ? flattenEntities(index) : []), [index]);

    const pluginNameById = useMemo(() => {
      const map = new Map<string, string>();
      if (index) {
        for (const plugin of index.plugins) {
          map.set(plugin.id, plugin.displayName);
        }
      }
      return map;
    }, [index]);

    const results = useMemo(() => {
      if (entities.length === 0) return [];
      const scored = searchEntities(entities, { query: query || undefined });
      return scored.slice(0, MAX_RESULTS).map((entry) => entry.entity);
    }, [entities, query]);

    const hasCatalog = entities.length > 0;
    const hasResults = results.length > 0;

    const close = useCallback(() => {
      setIsOpen(false);
      setQuery("");
      setActiveIndex(0);
      const target = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (target && typeof target.focus === "function") {
        // Deferred so the overlay has already unmounted/detached before we
        // hand focus back — some hosts otherwise re-steal focus on unmount.
        requestAnimationFrame(() => target.focus());
      }
    }, []);

    const open = useCallback(() => {
      // Capture the previously focused element BEFORE the input takes focus,
      // or focus restoration on close has nothing correct to return to.
      previouslyFocusedRef.current =
        (document.activeElement as HTMLElement | null) ?? null;
      setQuery("");
      setActiveIndex(0);
      setIsOpen(true);
    }, []);

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    // Focus the input once the overlay has mounted.
    useEffect(() => {
      if (!isOpen) return;
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }, [isOpen]);

    // Global shortcut listener — active regardless of open state, so it both
    // opens and toggles closed from every view.
    useEffect(() => {
      const handler = (event: KeyboardEvent) => {
        if (isPaletteShortcut(event)) {
          event.preventDefault();
          if (isOpen) {
            close();
          } else {
            open();
          }
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [isOpen, open, close]);

    // Inert the rest of the page + block background scroll while open.
    useEffect(() => {
      if (!isOpen) return;
      const overlay = overlayRef.current;
      const siblings = Array.from(document.body.children).filter((el) => el !== overlay);
      inertedSiblingsRef.current = siblings;
      for (const el of siblings) {
        el.setAttribute("inert", "");
        el.setAttribute("aria-hidden", "true");
      }
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        for (const el of inertedSiblingsRef.current) {
          el.removeAttribute("inert");
          el.removeAttribute("aria-hidden");
        }
        inertedSiblingsRef.current = [];
        document.body.style.overflow = previousOverflow;
      };
    }, [isOpen]);

    // Keep the active item scrolled into view.
    useEffect(() => {
      if (!isOpen) return;
      const list = listRef.current;
      if (!list) return;
      const activeEl = list.children[activeIndex] as HTMLElement | undefined;
      // jsdom does not implement `scrollIntoView` — guard so tests don't
      // crash on an API that only real browsers provide.
      activeEl?.scrollIntoView?.({ block: "nearest" });
    }, [isOpen, activeIndex, results.length]);

    // Reset the active selection whenever the visible result set changes.
    useEffect(() => {
      setActiveIndex(0);
    }, [results.length, query]);

    const navigateToActive = useCallback(() => {
      const entity = results[activeIndex];
      if (!entity) return;
      router.navigate(entityTarget(entity));
      close();
    }, [results, activeIndex, router, close]);

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "Tab") {
        // The input is the only focusable element in the palette; trap focus
        // by never letting Tab/Shift+Tab leave it.
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (results.length === 0) return;
        setActiveIndex((prev) => (prev + 1) % results.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (results.length === 0) return;
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        navigateToActive();
      }
    };

    if (!isOpen) return null;

    const activeEntity = results[activeIndex];
    const activeOptionId = activeEntity ? `palette-option-${entityKey(activeEntity)}` : undefined;

    return createPortal(
      <div className="command-palette" ref={overlayRef}>
        <div
          className="command-palette__backdrop"
          onClick={close}
          aria-hidden="true"
        />
        <div
          className="command-palette__dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t("shell.paletteTrigger")}
          onKeyDown={handleKeyDown}
        >
          <div className="command-palette__search">
            <span className="command-palette__search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={hasResults}
              aria-controls="palette-listbox"
              aria-activedescendant={activeOptionId}
              aria-autocomplete="list"
              aria-label={t("palette.placeholder")}
              placeholder={t("palette.placeholder")}
              className="command-palette__input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="command-palette__esc-hint" aria-hidden="true">
              {t("palette.escHint")}
            </span>
          </div>
          <div className="command-palette__body">
            {!hasCatalog ? (
              <p className="command-palette__message" role="status">
                {t("palette.nothingToSearch")}
              </p>
            ) : !hasResults ? (
              <p className="command-palette__message" role="status">
                {t("palette.noResults")}
              </p>
            ) : (
              <ul
                className="command-palette__list"
                id="palette-listbox"
                role="listbox"
                ref={listRef}
              >
                {results.map((entity, itemIndex) => {
                  const target = entityTarget(entity);
                  const optionId = `palette-option-${entityKey(entity)}`;
                  const kind = entityKindForBadge(entity);
                  const kindLabel = t(KIND_LABEL_KEYS[kind]);
                  const metaLabel =
                    entity.entityType === "plugin"
                      ? t("palette.metaLabel.plugin")
                      : pluginNameById.get(entity.artifact.owningPluginId) ?? "";
                  return (
                    <li
                      key={entityKey(entity)}
                      id={optionId}
                      role="option"
                      aria-selected={itemIndex === activeIndex}
                      className={
                        itemIndex === activeIndex
                          ? "command-palette__item command-palette__item--active"
                          : "command-palette__item"
                      }
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      onClick={() => {
                        router.navigate(target);
                        close();
                      }}
                    >
                      <span
                        className="command-palette__dot"
                        data-kind={kind}
                        aria-hidden="true"
                      />
                      <span className="command-palette__item-body">
                        <span className="command-palette__item-name">
                          {entityDisplayName(entity)}
                        </span>
                        {metaLabel ? (
                          <span className="command-palette__item-meta">
                            {" "}
                            · {metaLabel}
                          </span>
                        ) : null}
                      </span>
                      <span className="command-palette__item-kind">
                        {kindLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );
  },
);
