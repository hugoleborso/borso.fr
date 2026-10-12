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

export function parseLineAttributes(segments: readonly string[]): ReadonlyMap<string, string> {
  const attributes = new Map<string, string>();
  for (const attribute of segments.map(readLineAttribute)) {
    if (attribute.key !== null && !attributes.has(attribute.key)) {
      attributes.set(attribute.key, attribute.value);
    }
  }
  return attributes;
}

export function formatLineAttribute(key: string, value: string): string {
  return `${key}: ${value}`;
}
