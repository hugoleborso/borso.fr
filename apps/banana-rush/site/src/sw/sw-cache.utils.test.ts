import { describe, expect, it } from 'vitest';
import {
  isFingerprintedAssetPath,
  isLiveGamePath,
  isShellPath,
  isShellRequest,
  SHELL_PATHS,
} from './sw-cache.utils';

// @FollowsBlueprint test-pure-unit
describe('isShellPath', () => {
  it('recognises every address the shell is precached under', () => {
    for (const shellPath of SHELL_PATHS) {
      expect(isShellPath(shellPath)).toBe(true);
    }
  });

  it('refuses an address the shell does not cover', () => {
    expect(isShellPath('/partie/ULUL')).toBe(false);
    expect(isShellPath('/index.htmlx')).toBe(false);
  });
});

describe('isFingerprintedAssetPath', () => {
  it('recognises the folders a build stamps a hash into', () => {
    expect(isFingerprintedAssetPath('/assets/index-a1b2c3.js')).toBe(true);
    expect(isFingerprintedAssetPath('/icons/icon-192.png')).toBe(true);
    expect(isFingerprintedAssetPath('/fonts/nunito.woff2')).toBe(true);
  });

  it('refuses anything else', () => {
    expect(isFingerprintedAssetPath('/api/games/ULUL')).toBe(false);
    expect(isFingerprintedAssetPath('/partie/ULUL')).toBe(false);
  });
});

describe('isLiveGamePath', () => {
  it('claims everything under the API, which may never be cached', () => {
    expect(isLiveGamePath('/api/games/ULUL')).toBe(true);
    expect(isLiveGamePath('/api/config')).toBe(true);
  });

  it('leaves the rest of the site alone', () => {
    expect(isLiveGamePath('/apiary')).toBe(false);
    expect(isLiveGamePath('/')).toBe(false);
  });
});

describe('isShellRequest', () => {
  it('claims any navigation, whatever address the router owns behind it', () => {
    expect(isShellRequest('navigate', '/partie/ULUL')).toBe(true);
    expect(isShellRequest('navigate', '/nouvelle-partie')).toBe(true);
  });

  it('claims a shell asset fetched outside a navigation', () => {
    expect(isShellRequest('cors', '/manifest.webmanifest')).toBe(true);
  });

  it('leaves everything else to the other strategies', () => {
    expect(isShellRequest('cors', '/assets/index-a1b2c3.js')).toBe(false);
    expect(isShellRequest('no-cors', '/api/config')).toBe(false);
  });
});
