const FINGERPRINTED_ASSET_PREFIXES = ['/assets/', '/icons/', '/fonts/'] as const;

export const SHELL_PATHS = ['/', '/index.html', '/manifest.webmanifest'] as const;

const LIVE_API_PREFIX = '/api/';

const NAVIGATION_MODE = 'navigate';

/**
 * @Blueprint utils-what-a-live-game-may-never-serve-from-a-cache
 * @BlueprintName Utils What A Live Game May Never Serve From A Cache
 * @BlueprintUsage Use in the service worker of any application whose screens show what other people are doing right now.
 * @BlueprintDescription Splits every request into the two kinds an application of this sort actually has, and refuses the middle ground a general purpose caching strategy would invent. The shell and the fingerprinted assets are safe to serve from a cache because their content is fixed once built — a fingerprinted name changes when the bytes change, so a stale copy is impossible rather than merely unlikely. Everything under the API is the opposite: a cached crate, stash or bid is not a slow answer but a wrong one, and a player shown a round that closed thirty seconds ago will bid into it, which is worse than a player shown nothing. So there is deliberately no stale-while-revalidate tier here, and no offline read of game state at all: the value a cache adds to this application is that the shell opens instantly from a home screen, not that the game survives a tunnel.
 */
export function isShellPath(pathname: string): boolean {
  return SHELL_PATHS.some((shellPath) => shellPath === pathname);
}

export function isFingerprintedAssetPath(pathname: string): boolean {
  return FINGERPRINTED_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isLiveGamePath(pathname: string): boolean {
  return pathname.startsWith(LIVE_API_PREFIX);
}

export function isShellRequest(requestMode: string, pathname: string): boolean {
  return requestMode === NAVIGATION_MODE || isShellPath(pathname);
}
