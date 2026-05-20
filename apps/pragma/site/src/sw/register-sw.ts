/**
 * Service-worker registration helper. Called once at app boot from
 * `main.tsx`. The actual SW lives at `/sw.js` (served from
 * `site/public/`) so the scope encompasses the whole origin.
 *
 * Registration is skipped in dev (Vite's HMR conflicts with caching).
 * Errors are logged but never rethrown — the app still works without
 * a SW, the offline cache simply doesn't fill.
 */

const SERVICE_WORKER_URL = '/sw.js';

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error) => {
    console.warn('service worker registration failed', error);
  });
}
