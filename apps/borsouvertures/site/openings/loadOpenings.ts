import bundledOpeningsJson from './openings.json';
import { parseOpenings } from './parseOpenings.utils';
import type { Opening } from './types';

const OPENINGS_URL = '/openings.json';

/**
 * Fetch the openings dataset over the network, falling back to the JSON
 * bundled into the JS chunks if the network path fails (offline, dev server
 * misconfig, etc.). The service worker also caches `/openings.json` first-time
 * (see `vite.config.ts` workbox config), so repeat visits are offline-capable.
 */
export async function loadOpenings(): Promise<Opening[]> {
  try {
    const response = await fetch(OPENINGS_URL, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to fetch openings.json (${response.status})`);
    }
    const data: unknown = await response.json();
    const parsed = parseOpenings(data);
    if (parsed.length === 0) throw new Error('openings.json returned empty data');
    return parsed;
  } catch (error) {
    console.warn('Falling back to bundled openings.json', error);
    const fallback: unknown = bundledOpeningsJson;
    return parseOpenings(fallback);
  }
}
