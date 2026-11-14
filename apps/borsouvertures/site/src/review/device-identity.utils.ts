export const DEVICE_ID_STORAGE_KEY = 'borsouvertures.device-id';

export interface DeviceIdentityStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

// @FollowsBlueprint injected-storage-slice
export function readDeviceId(
  storage: DeviceIdentityStorage | undefined,
  buildDeviceId: () => string,
): string {
  if (storage === undefined) return buildDeviceId();
  const saved = storage.getItem(DEVICE_ID_STORAGE_KEY);
  if (saved !== null && saved.length > 0) return saved;
  const deviceId = buildDeviceId();
  storage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}
