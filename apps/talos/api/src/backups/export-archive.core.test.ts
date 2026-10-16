import { describe, expect, it } from 'vitest';
import { buildExportRequestHeaders, exportObjectKey, summariseExport } from './export-archive.core';

describe('exportObjectKey', () => {
  it('files the export under the UTC date it ran', () => {
    expect(exportObjectKey(new Date('2026-10-18T02:00:05Z'))).toBe('exports/2026-10-18.json');
  });
});

describe('buildExportRequestHeaders', () => {
  it('presents the agent token as a bearer credential', () => {
    expect(buildExportRequestHeaders('jeton')).toEqual({
      Authorization: 'Bearer jeton',
      Accept: 'application/json',
    });
  });
});

describe('summariseExport', () => {
  it('counts the tables of a well formed export', () => {
    const raw = JSON.stringify({
      exportedAt: '2026-10-18T02:00:04Z',
      tables: { entities: [{ slug: 'a' }], events: [] },
    });
    expect(summariseExport(raw)).toEqual({ exportedAt: '2026-10-18T02:00:04Z', tableCount: 2 });
  });

  it('refuses a body that is not JSON', () => {
    expect(summariseExport('<html>')).toBeNull();
  });

  it('refuses JSON without the export shape', () => {
    expect(summariseExport(JSON.stringify({ error: 'jeton invalide' }))).toBeNull();
    expect(summariseExport(JSON.stringify({ exportedAt: 'x', tables: { a: 1 } }))).toBeNull();
  });
});
