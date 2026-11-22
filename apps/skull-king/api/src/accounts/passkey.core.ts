import { z } from 'zod';

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

function parseJsonOrNull(text: string): unknown {
  try {
    const decodedValue: unknown = JSON.parse(text);
    return decodedValue;
  } catch {
    return null;
  }
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

export function isWebauthnResponse(value: unknown): value is { id: string; rawId: string } {
  return readStringProperty(value, 'id') !== null && readStringProperty(value, 'rawId') !== null;
}
