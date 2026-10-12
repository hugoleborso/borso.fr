import { z } from 'zod';
import { parseJsonOrNull } from '../helpers/json/json.core';

const recordSchema = z.record(z.string(), z.unknown());

function toRecord(value: unknown): Record<string, unknown> | null {
  const record = recordSchema.safeParse(value);
  return record.success ? record.data : null;
}

function readStringProperty(value: unknown, key: string): string | null {
  const record = toRecord(value);
  if (record === null) return null;
  const found = record[key];
  return typeof found === 'string' && found.length > 0 ? found : null;
}

function decodeClientDataChallenge(clientDataJson: string): string | null {
  const decoded = parseJsonOrNull(Buffer.from(clientDataJson, 'base64url').toString('utf8'));
  return readStringProperty(decoded, 'challenge');
}

// @FollowsBlueprint core-parse-untrusted
export function readChallengeFromResponse(value: unknown): string | null {
  const direct = readStringProperty(value, 'challenge');
  if (direct !== null) return direct;
  const record = toRecord(value);
  if (record === null) return null;
  const clientDataJson = readStringProperty(record.response, 'clientDataJSON');
  if (clientDataJson === null) return null;
  return decodeClientDataChallenge(clientDataJson);
}

export function readCredentialIdFromResponse(value: unknown): string | null {
  return readStringProperty(value, 'id');
}

const KNOWN_TRANSPORTS = [
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
] as const;

export type KnownTransport = (typeof KNOWN_TRANSPORTS)[number];

function isKnownTransport(value: unknown): value is KnownTransport {
  return KNOWN_TRANSPORTS.some((transport) => transport === value);
}

export function parseTransports(stored: string): KnownTransport[] {
  const decoded = parseJsonOrNull(stored);
  return Array.isArray(decoded) ? decoded.filter(isKnownTransport) : [];
}

export function isWebauthnResponse(value: unknown): value is { id: string; rawId: string } {
  return readStringProperty(value, 'id') !== null && readStringProperty(value, 'rawId') !== null;
}

export type ChallengePurpose = 'registration' | 'authentication';

export interface StoredChallenge {
  readonly purpose: string;
  readonly expiresAt: Date;
}

export function isChallengeUsable(
  stored: StoredChallenge | null,
  purpose: ChallengePurpose,
  nowMillis: number,
): boolean {
  return stored?.purpose === purpose && stored.expiresAt.getTime() > nowMillis;
}

const transportsSchema = z.object({ response: z.object({ transports: z.array(z.unknown()) }) });

export function readTransportsFromResponse(value: unknown): KnownTransport[] {
  const withTransports = transportsSchema.safeParse(value);
  return withTransports.success
    ? withTransports.data.response.transports.filter(isKnownTransport)
    : [];
}
