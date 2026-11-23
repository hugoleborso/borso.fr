const FINGERPRINTED_ASSET_PREFIXES = ['/assets/', '/icons/', '/fonts/'] as const;

export const SHELL_PATHS = ['/', '/index.html', '/manifest.webmanifest'] as const;

const LIVE_API_PREFIX = '/api/';

const NAVIGATION_MODE = 'navigate';

// @FollowsBlueprint utils-what-a-live-game-may-never-serve-from-a-cache
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
