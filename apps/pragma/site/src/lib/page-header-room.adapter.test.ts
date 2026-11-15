import { afterEach, describe, expect, it, vi } from 'vitest';
import { HEADER_HEIGHT_PROPERTY, reserveRoomForPageHeader } from './page-header-room.adapter';

const HEADER_HEIGHT = 132;

function headerOfHeight(height: number): HTMLElement {
  const header = document.createElement('header');
  header.getBoundingClientRect = () => DOMRect.fromRect({ height });
  document.body.append(header);
  return header;
}

function readRoom(): string {
  return document.documentElement.style.getPropertyValue(HEADER_HEIGHT_PROPERTY);
}

describe('reserveRoomForPageHeader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    document.documentElement.style.removeProperty(HEADER_HEIGHT_PROPERTY);
  });

  it('reserves the height of the header for the content under it', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const release = reserveRoomForPageHeader(headerOfHeight(HEADER_HEIGHT));
    expect(readRoom()).toBe(`${HEADER_HEIGHT}px`);

    release?.();
    expect(readRoom()).toBe('');
  });

  it('follows the header when it grows, and frees the room once it leaves', () => {
    const resizeCallbacks: (() => void)[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resizeCallbacks.push(callback);
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    const header = headerOfHeight(HEADER_HEIGHT);
    const release = reserveRoomForPageHeader(header);

    header.getBoundingClientRect = () => DOMRect.fromRect({ height: HEADER_HEIGHT + 40 });
    for (const callback of resizeCallbacks) callback();
    expect(readRoom()).toBe(`${HEADER_HEIGHT + 40}px`);

    release?.();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(readRoom()).toBe('');
  });

  it('does nothing when React detaches the header', () => {
    expect(reserveRoomForPageHeader(null)).toBeUndefined();
  });
});
