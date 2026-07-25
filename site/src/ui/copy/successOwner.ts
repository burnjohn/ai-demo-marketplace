/**
 * Single shared owner of "which copy control last succeeded".
 *
 * Copy controls are independent components that may render anywhere in the
 * tree (result cards, plugin detail, artifact detail, getting-started
 * steps). The single-success invariant — at most one control shows its
 * success label at a time — can't be satisfied by per-control state alone,
 * because one control has no way to know another just succeeded. A plain
 * module-level store (read via `useSyncExternalStore`) gives every mounted
 * control instance access to the same "who currently owns success" value
 * without requiring callers to wrap their tree in a dedicated provider.
 */

type Listener = () => void;

let activeId: string | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

/** Claims the success state for `id`, immediately releasing any previous owner. */
export function claimSuccess(id: string): void {
  activeId = id;
  emit();
}

/** Releases the success state if `id` currently owns it. */
export function releaseSuccess(id: string): void {
  if (activeId === id) {
    activeId = null;
    emit();
  }
}

export function getActiveSuccessId(): string | null {
  return activeId;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: resets the shared owner between test cases. */
export function __resetSuccessOwnerForTests(): void {
  activeId = null;
  listeners.clear();
}
