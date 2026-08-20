/** @DependsOnExternal browser-service-worker */

const SERVICE_WORKER_URL = '/sw.js';

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error: unknown) => {
    console.warn('service worker registration failed', error);
  });
}
