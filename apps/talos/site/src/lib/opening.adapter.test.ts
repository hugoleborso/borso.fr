import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hasOpeningPlayed,
  hideDockTarget,
  isMotionReduced,
  didRecordOpening,
  measureDockTarget,
  type OpeningStorage,
  readSessionStorage,
  readViewport,
} from './opening.adapter';

function buildStorage(): OpeningStorage & { readonly storedFlags: Map<string, string> } {
  const storedFlags = new Map<string, string>();
  return {
    storedFlags,
    getItem: (key) => storedFlags.get(key) ?? null,
    setItem: (key, value) => {
      storedFlags.set(key, value);
    },
  };
}

function mountDockTarget(): HTMLImageElement {
  const logo = document.createElement('img');
  logo.setAttribute('data-opening-dock', '');
  logo.getBoundingClientRect = () => DOMRect.fromRect({ x: 16, y: 12, width: 30, height: 28 });
  document.body.append(logo);
  return logo;
}

describe('the opening session flag', () => {
  it('is unset in a fresh session, then set once marked', () => {
    const storage = buildStorage();
    expect(hasOpeningPlayed(storage)).toBe(false);
    didRecordOpening(storage);
    expect(storage.storedFlags.get('talos.opening-played')).toBe('1');
    expect(hasOpeningPlayed(storage)).toBe(true);
  });

  it('ignores any other value under the key', () => {
    const storage = buildStorage();
    storage.setItem('talos.opening-played', 'yes');
    expect(hasOpeningPlayed(storage)).toBe(false);
  });

  it('reports the flag remembered once written', () => {
    expect(didRecordOpening(buildStorage())).toBe(true);
  });

  it('swallows a storage that refuses the write, as a full quota does', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(didRecordOpening(storage)).toBe(false);
  });
});

describe('readSessionStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hands back the session storage of the window', () => {
    expect(readSessionStorage()).toBe(window.sessionStorage);
  });

  it('stands in a storage that remembers nothing where reading it throws, as a locked down browser does', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const storage = readSessionStorage();
    expect(didRecordOpening(storage)).toBe(true);
    expect(hasOpeningPlayed(storage)).toBe(false);
  });
});

describe('isMotionReduced', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([true, false])('answers the reduced motion query as %s', (matches) => {
    const matchMedia = vi.fn(() => ({ matches }));
    vi.stubGlobal('matchMedia', matchMedia);
    expect(isMotionReduced()).toBe(matches);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
});

describe('readViewport', () => {
  it('reads the inner size of the window', () => {
    expect(readViewport()).toEqual({ width: window.innerWidth, height: window.innerHeight });
  });
});

describe('the dock target', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('measures the header logo in viewport coordinates', () => {
    mountDockTarget();
    expect(measureDockTarget()).toEqual({ left: 16, top: 12, width: 30, height: 28 });
  });

  it('measures nothing when no header logo is on screen', () => {
    expect(measureDockTarget()).toBeNull();
  });

  it('hides the header logo while the coin flies to it, then shows it again', () => {
    const logo = mountDockTarget();
    hideDockTarget(true);
    expect(logo.style.visibility).toBe('hidden');
    hideDockTarget(false);
    expect(logo.style.visibility).toBe('');
  });

  it('does nothing to hide when no header logo is on screen', () => {
    expect(() => {
      hideDockTarget(true);
    }).not.toThrow();
  });
});
