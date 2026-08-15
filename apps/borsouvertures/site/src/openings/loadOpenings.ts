import bundledOpeningsJson from './openings.json';
import { fetchOpeningsDocument } from './openingsSource.adapter';
import { parseOpenings } from './parseOpenings.utils';
import type { Opening } from './types';

const OPENINGS_URL = '/openings.json';

type LoadOpeningsResult = { ok: true; openings: Opening[] } | { ok: false; error: Error };

/**
 * Fetch the openings dataset, falling back to the JSON bundled into the JS
 * chunks if the network path fails. The service worker also caches
 * `/openings.json` first-time (see `vite.config.ts` workbox config), so repeat
 * visits are offline-capable.
 *
 * Returns a tagged result so the App can render a hard-error UI when both the
 * network and the bundled fallback fail (data corruption / shape drift).
 */
export async function loadOpenings(): Promise<LoadOpeningsResult> {
  const body = await fetchOpeningsDocument(OPENINGS_URL);
  if (body !== null) {
    const openings = parseOpenings(body);
    if (openings.length > 0) return { ok: true, openings };
  }
  try {
    const fallback = parseOpenings(bundledOpeningsJson);
    if (fallback.length === 0) {
      return { ok: false, error: new Error('bundled openings.json is empty') };
    }
    return { ok: true, openings: fallback };
  } catch (bundledError) {
    const error = bundledError instanceof Error ? bundledError : new Error(String(bundledError));
    return { ok: false, error };
  }
}
