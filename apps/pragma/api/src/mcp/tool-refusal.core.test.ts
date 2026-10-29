import { describe, expect, it } from 'vitest';
import {
  describeInvalidFields,
  describeUnresolvedReference,
  LISTED_CANDIDATES_MAX,
  pickReference,
  readToolRefusal,
  ToolRefusedError,
} from './tool-refusal.core';

function buildCandidates(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `song-${String(index)}`,
    label: `Song ${String(index)}`,
  }));
}

// @FollowsBlueprint test-pure-unit
describe('ToolRefusedError', () => {
  it('carries the refusal body and names itself after its error code', () => {
    const error = new ToolRefusedError({ error: 'song-not-found', reference: 'Creep' });
    expect(error.name).toBe('ToolRefusedError');
    expect(error.message).toBe('song-not-found');
    expect(readToolRefusal(error)).toEqual({ error: 'song-not-found', reference: 'Creep' });
  });

  it('reads nothing from any other thrown value', () => {
    expect(readToolRefusal(new Error('song-not-found'))).toBeNull();
    expect(readToolRefusal('song-not-found')).toBeNull();
  });
});

describe('describeUnresolvedReference', () => {
  it('names the noun and the reference nothing matched', () => {
    expect(describeUnresolvedReference('song', 'Creep', { kind: 'missing' })).toEqual({
      error: 'song-not-found',
      reference: 'Creep',
    });
  });

  it('lists every candidate of an ambiguous reference', () => {
    const candidates = buildCandidates(LISTED_CANDIDATES_MAX);
    expect(describeUnresolvedReference('song', 'Song', { kind: 'ambiguous', candidates })).toEqual({
      error: 'song-ambiguous',
      reference: 'Song',
      candidates,
    });
  });

  it('lists the first candidates and counts the others past the limit', () => {
    const candidates = buildCandidates(LISTED_CANDIDATES_MAX + 2);
    expect(describeUnresolvedReference('song', 'Song', { kind: 'ambiguous', candidates })).toEqual({
      error: 'song-ambiguous',
      reference: 'Song',
      candidates: candidates.slice(0, LISTED_CANDIDATES_MAX),
      more: 2,
    });
  });
});

describe('pickReference', () => {
  const candidates = [
    { id: 'song-1', label: 'Creep' },
    { id: 'song-2', label: 'Karma Police' },
  ];

  it('answers the id of the one candidate the reference names', () => {
    expect(pickReference('song', candidates, 'karma')).toBe('song-2');
  });

  it('throws a refusal naming the noun when nothing matches', () => {
    expect(() => pickReference('song', candidates, 'Airbag')).toThrow(
      new ToolRefusedError({ error: 'song-not-found', reference: 'Airbag' }),
    );
    expect(() => pickReference('song', candidates, 'Airbag')).toThrow(ToolRefusedError);
  });
});

describe('describeInvalidFields', () => {
  it('names each field once, with the first problem found in it', () => {
    expect(
      describeInvalidFields([
        { path: ['status'], message: 'Required' },
        { path: ['links', 0, 'url'], message: 'Invalid url' },
        { path: ['status'], message: 'Invalid enum value' },
      ]),
    ).toEqual({
      error: 'invalid-input',
      fields: { status: 'Required', 'links.0.url': 'Invalid url' },
    });
  });

  it('names the whole input when the problem has no field', () => {
    expect(describeInvalidFields([{ path: [], message: 'Invalid input' }])).toEqual({
      error: 'invalid-input',
      fields: { input: 'Invalid input' },
    });
  });
});
