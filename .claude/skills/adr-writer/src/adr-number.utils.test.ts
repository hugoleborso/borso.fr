import { describe, expect, it } from 'vitest';
import {
  findConflictingAdrs,
  nextAdrNumber,
  parseAdrNumberFromFilename,
} from './adr-number.utils';
import type { Adr } from './types';

function makeAdr(overrides: Partial<Adr> = {}): Adr {
  return {
    number: 1,
    slug: 'pick-a-thing',
    title: 'Pick a thing',
    status: 'accepted',
    date: '2026-05-13',
    context: 'context',
    decision: 'decision',
    consequences: 'consequences',
    ...overrides,
  };
}

describe('parseAdrNumberFromFilename', () => {
  it('returns the number for a valid ADR filename', () => {
    expect(parseAdrNumberFromFilename('0007-tenant-isolation.md')).toBe(7);
  });

  it('returns null when the filename does not match the pattern', () => {
    expect(parseAdrNumberFromFilename('README.md')).toBeNull();
    expect(parseAdrNumberFromFilename('7-too-short.md')).toBeNull();
    expect(parseAdrNumberFromFilename('0007.md')).toBeNull();
    expect(parseAdrNumberFromFilename('0007-Capital-Letters.md')).toBeNull();
  });
});

describe('nextAdrNumber', () => {
  it('returns 1 when the directory is empty', () => {
    expect(nextAdrNumber([])).toBe(1);
  });

  it('returns 1 when no filename matches the ADR pattern', () => {
    expect(nextAdrNumber(['README.md', 'index.md'])).toBe(1);
  });

  it('returns one more than the highest valid number', () => {
    expect(nextAdrNumber(['0001-a.md', '0002-b.md', '0005-c.md'])).toBe(6);
  });

  it('ignores non-matching siblings when computing the next number', () => {
    expect(nextAdrNumber(['0001-a.md', 'README.md', '0042-z.md', 'index.md'])).toBe(43);
  });
});

describe('findConflictingAdrs', () => {
  it('returns an empty list when no existing ADR shares the slug', () => {
    const existing = [makeAdr({ number: 1, slug: 'other-thing' })];
    const conflicts = findConflictingAdrs({ slug: 'pick-a-thing' }, existing);
    expect(conflicts).toEqual([]);
  });

  it('flags an accepted ADR with the same slug as a conflict', () => {
    const existing = [makeAdr({ number: 3, slug: 'pick-a-thing' })];
    const conflicts = findConflictingAdrs({ slug: 'pick-a-thing' }, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.number).toBe(3);
  });

  it('does not flag a superseded ADR with the same slug', () => {
    const existing = [makeAdr({ number: 3, slug: 'pick-a-thing', status: 'superseded' })];
    const conflicts = findConflictingAdrs({ slug: 'pick-a-thing' }, existing);
    expect(conflicts).toEqual([]);
  });

  it('does not flag an accepted ADR that the new ADR explicitly supersedes', () => {
    const existing = [makeAdr({ number: 3, slug: 'pick-a-thing' })];
    const conflicts = findConflictingAdrs(
      { slug: 'pick-a-thing', supersedes: [3] },
      existing,
    );
    expect(conflicts).toEqual([]);
  });

  it('returns every undeclared accepted conflict when several share the slug', () => {
    const existing = [
      makeAdr({ number: 3, slug: 'pick-a-thing' }),
      makeAdr({ number: 5, slug: 'pick-a-thing' }),
      makeAdr({ number: 6, slug: 'pick-a-thing', status: 'superseded' }),
    ];
    const conflicts = findConflictingAdrs(
      { slug: 'pick-a-thing', supersedes: [3] },
      existing,
    );
    expect(conflicts.map((adr) => adr.number)).toEqual([5]);
  });
});
