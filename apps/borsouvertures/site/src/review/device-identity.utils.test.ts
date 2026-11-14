import { describe, expect, it } from 'vitest';
import { DEVICE_ID_STORAGE_KEY, readDeviceId } from './device-identity.utils';

function buildStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

// @FollowsBlueprint test-pure-unit
describe('readDeviceId', () => {
  it('makes an id on first use and stores it under the device key', () => {
    const storage = buildStorage();
    expect(readDeviceId(storage, () => 'made-once')).toBe('made-once');
    expect(DEVICE_ID_STORAGE_KEY).toBe('borsouvertures.device-id');
    expect(storage.values.get('borsouvertures.device-id')).toBe('made-once');
  });

  it('returns the stored id without making another', () => {
    const storage = buildStorage({ 'borsouvertures.device-id': 'stored' });
    expect(readDeviceId(storage, () => 'never')).toBe('stored');
    expect(storage.values.size).toBe(1);
  });

  it('replaces an empty stored id', () => {
    const storage = buildStorage({ 'borsouvertures.device-id': '' });
    expect(readDeviceId(storage, () => 'fresh')).toBe('fresh');
    expect(storage.values.get('borsouvertures.device-id')).toBe('fresh');
  });

  it('makes an id every time when the browser has no storage', () => {
    expect(readDeviceId(undefined, () => 'unsaved')).toBe('unsaved');
  });
});
