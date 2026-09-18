/** @Feature shell */

async function dropEverythingThePageIsServedFrom(): Promise<void> {
  if ('caches' in globalThis) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

// @FollowsBlueprint browser-clipboard-write
export function reload(): void {
  globalThis.location.reload();
}

// @FollowsBlueprint browser-clipboard-write
export async function discardCachesAndReload(): Promise<void> {
  await dropEverythingThePageIsServedFrom().catch(() => undefined);
  reload();
}
