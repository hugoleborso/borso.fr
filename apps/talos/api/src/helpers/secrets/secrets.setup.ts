import { readSecureParameter } from './parameter-store.client';

export type SecretName =
  | 'github-token'
  | 'vapid-public'
  | 'vapid-private'
  | 'session-hmac'
  | 'bootstrap-code'
  | 'notify-secret'
  | 'fire-url'
  | 'fire-token'
  | 'secret-phrase';

export type SecretReader = (name: SecretName) => Promise<string | undefined>;

const PREFIX_VARIABLE = 'TALOS_SSM_PREFIX';
const DEFAULT_PREFIX = '/talos/';

interface SecretHolder {
  chosen: SecretReader | null;
  readonly cache: Map<SecretName, string>;
}

const holder: SecretHolder = { chosen: null, cache: new Map() };

export function useSecretReader(reader: SecretReader): void {
  holder.chosen = reader;
}

async function readFromParameterStore(name: SecretName): Promise<string | undefined> {
  const cached = holder.cache.get(name);
  if (cached !== undefined) return cached;
  const prefix = process.env[PREFIX_VARIABLE] ?? DEFAULT_PREFIX;
  const value = await readSecureParameter(`${prefix}${name}`);
  if (value !== undefined) holder.cache.set(name, value);
  return value;
}

// @FollowsBlueprint adapter-chosen-by-the-composition-root
export async function readTalosSecret(name: SecretName): Promise<string | undefined> {
  if (holder.chosen !== null) return await holder.chosen(name);
  return await readFromParameterStore(name);
}
