import { describe, expect, it } from 'vitest';
import { padAdrNumber, renderAdrFilename, renderAdrMarkdown } from './adr-render.utils';
import type { Adr } from './types';

function makeAdr(overrides: Partial<Adr> = {}): Adr {
  return {
    number: 7,
    slug: 'tenant-isolation',
    title: 'Isolate tenants per database',
    status: 'accepted',
    date: '2026-05-13',
    context: 'Two tenants share the same DB cluster today.',
    decision: 'Move each tenant to its own logical database.',
    consequences: 'Higher operational cost, simpler authorization rules.',
    ...overrides,
  };
}

describe('padAdrNumber', () => {
  it('pads a single-digit number to four characters', () => {
    expect(padAdrNumber(1)).toBe('0001');
  });

  it('does not pad a number that already has four digits', () => {
    expect(padAdrNumber(1234)).toBe('1234');
  });
});

describe('renderAdrFilename', () => {
  it('combines padded number and slug with .md extension', () => {
    expect(renderAdrFilename({ number: 42, slug: 'tenant-isolation' })).toBe(
      '0042-tenant-isolation.md',
    );
  });
});

describe('renderAdrMarkdown', () => {
  it('renders the canonical Context / Decision / Consequences sections', () => {
    const rendered = renderAdrMarkdown(makeAdr());
    expect(rendered).toContain('# ADR 0007 — Isolate tenants per database');
    expect(rendered).toContain('**Status:** accepted');
    expect(rendered).toContain('**Date:** 2026-05-13');
    expect(rendered).toContain('## Context');
    expect(rendered).toContain('Two tenants share the same DB cluster today.');
    expect(rendered).toContain('## Decision');
    expect(rendered).toContain('Move each tenant to its own logical database.');
    expect(rendered).toContain('## Consequences');
    expect(rendered).toContain('Higher operational cost, simpler authorization rules.');
  });

  it('omits the Supersedes line when supersedes is undefined', () => {
    expect(renderAdrMarkdown(makeAdr())).not.toContain('**Supersedes:**');
  });

  it('omits the Supersedes line when supersedes is an empty array', () => {
    expect(renderAdrMarkdown(makeAdr({ supersedes: [] }))).not.toContain('**Supersedes:**');
  });

  it('emits a Supersedes line with padded numbers when supersedes is non-empty', () => {
    const rendered = renderAdrMarkdown(makeAdr({ supersedes: [3, 5] }));
    expect(rendered).toContain('**Supersedes:** 0003, 0005');
  });

  it('emits a Superseded by line when supersededBy is set', () => {
    const rendered = renderAdrMarkdown(makeAdr({ status: 'superseded', supersededBy: 12 }));
    expect(rendered).toContain('**Superseded by:** 0012');
  });

  it('omits the Superseded by line when supersededBy is undefined', () => {
    expect(renderAdrMarkdown(makeAdr())).not.toContain('**Superseded by:**');
  });
});
