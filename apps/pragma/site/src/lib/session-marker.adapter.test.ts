/**
 * The marker is a hint the route guard reads before it decides whether asking
 * the API is worth a request, so what matters is that a browser which has
 * never signed in reads `false` and one that has reads `true`.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  forgetSessionMarker,
  hasSessionMarker,
  rememberSessionMarker,
} from './session-marker.adapter';

describe('the session marker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is absent in a browser that has never signed in', () => {
    expect(hasSessionMarker()).toBe(false);
  });

  it('is present once signing in has been remembered', () => {
    rememberSessionMarker();
    expect(hasSessionMarker()).toBe(true);
  });

  it('is gone again once forgotten', () => {
    rememberSessionMarker();
    forgetSessionMarker();
    expect(hasSessionMarker()).toBe(false);
  });

  it('reads false rather than throwing when the stored value is not the one written', () => {
    localStorage.setItem('pragma.session-seen', 'yes');
    expect(hasSessionMarker()).toBe(false);
  });
});
