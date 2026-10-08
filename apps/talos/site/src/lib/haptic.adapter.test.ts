import { afterEach, describe, expect, it, vi } from 'vitest';
import { pulseHaptic } from './haptic.adapter';

describe('pulseHaptic', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('vibrates briefly where the device can', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    pulseHaptic();
    expect(vibrate).toHaveBeenCalledWith(12);
  });

  it('does nothing where the browser has no vibration, as on iOS', () => {
    vi.stubGlobal('navigator', {});
    expect(() => {
      pulseHaptic();
    }).not.toThrow();
  });
});
