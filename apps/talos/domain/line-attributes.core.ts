import { readCapture } from './text.core';

export interface LineAttribute {
  readonly key: string | null;
  readonly value: string;
  readonly raw: string;
}

const ATTRIBUTE_PATTERN = /^(?<key>[^:]+?)\s*:\s?(?<value>.*)$/;

export function normalizeAttributeKey(key: string): string {
  return key.trim().normalize('NFC');
}

export function readLineAttribute(segment: string): LineAttribute {
  const raw = segment.trim();
  const match = ATTRIBUTE_PATTERN.exec(raw);
  if (match === null) return { key: null, value: raw, raw };
  return {
    key: normalizeAttributeKey(readCapture(match, 'key')),
    value: readCapture(match, 'value').trim(),
    raw,
  };
}
