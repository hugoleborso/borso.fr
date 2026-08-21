import { listWhen } from './optional.utils';

type Listener = () => void;

const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

// @FollowsBlueprint external-store-module
export function subscribeLocation(listener: Listener): () => void {
  listeners.add(listener);
  globalThis.addEventListener('popstate', notifyListeners);
  return () => {
    listeners.delete(listener);
    globalThis.removeEventListener('popstate', notifyListeners);
  };
}

export function readPathname(): string {
  return globalThis.location.pathname;
}

export function readServerPathname(): string {
  return '/';
}

export function navigate(path: string): void {
  for (const target of listWhen(globalThis.location.pathname !== path, path)) {
    globalThis.history.pushState({}, '', target);
    notifyListeners();
  }
}
