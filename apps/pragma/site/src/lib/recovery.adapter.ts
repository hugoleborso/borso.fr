/** @Feature shell */

async function dropEveryCache(): Promise<void> {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function unregisterEveryWorker(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

// @FollowsBlueprint browser-clipboard-write
export function reload(): void {
  globalThis.location.reload();
}

// @FollowsBlueprint browser-clipboard-write
export async function discardCachesAndReload(): Promise<void> {
  await dropEveryCache().catch(() => undefined);
  await unregisterEveryWorker().catch(() => undefined);
  reload();
}
