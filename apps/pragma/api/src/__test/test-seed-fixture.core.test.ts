import { describe, expect, it } from 'vitest';
import {
  BLANK_ENTRY_DETAIL,
  SEED_INSTRUMENTS,
  SEED_MEMBERS,
  SEED_SONGS,
  SEED_TRANSITION_COMMENT,
} from './test-seed-fixture.core';
import { selectPrimaryInstrumentIds } from './test-seed.core';

const SLOTS_BEYOND_MEMBER_COUNT = 2;

const instrumentNames = new Set(SEED_INSTRUMENTS.map((instrument) => instrument.name));
const memberNames = new Set(SEED_MEMBERS.map((member) => member.firstName));

// @FollowsBlueprint test-pure-unit
describe('the seeded band', () => {
  it('gives every member instruments the fixture also declares', () => {
    for (const member of SEED_MEMBERS) {
      for (const instrumentName of member.instrumentNames) {
        expect(instrumentNames).toContain(instrumentName);
      }
    }
  });

  it('names in every song lineup a member and an instrument the fixture declares', () => {
    for (const song of SEED_SONGS) {
      for (const [memberName, playedInstruments] of Object.entries(song.lineup)) {
        expect(memberNames).toContain(memberName);
        for (const instrumentName of playedInstruments) {
          expect(instrumentNames).toContain(instrumentName);
        }
      }
    }
  });
});

describe('the primacy the seeded band ships with', () => {
  const instrumentIdByName = new Map(
    SEED_INSTRUMENTS.map((instrument) => [instrument.name, instrument.name]),
  );

  const primaryInstrumentNameOf = (member: (typeof SEED_MEMBERS)[number]): string | undefined =>
    selectPrimaryInstrumentIds(member.instrumentNames, instrumentIdByName)[0];

  it('gives every member exactly one primary instrument, so the lineup column is never empty', () => {
    for (const member of SEED_MEMBERS) {
      expect(selectPrimaryInstrumentIds(member.instrumentNames, instrumentIdByName)).toHaveLength(
        1,
      );
    }
  });

  it('names that primary instrument first in the member roster', () => {
    for (const member of SEED_MEMBERS) {
      expect(primaryInstrumentNameOf(member)).toBe(member.instrumentNames[0]);
    }
  });

  it('draws a slot for every instrument family the band declares', () => {
    const primaryNames = new Set(SEED_MEMBERS.map(primaryInstrumentNameOf));
    const familiesWithASlot = new Set(
      SEED_INSTRUMENTS.filter((instrument) => primaryNames.has(instrument.name)).map(
        (instrument) => instrument.family,
      ),
    );
    expect(familiesWithASlot).toEqual(new Set(['harmonic', 'percussive']));
  });

  it('stays within the slot budget of the members plus two', () => {
    const primaryNames = new Set(SEED_MEMBERS.map(primaryInstrumentNameOf));
    expect(primaryNames.size).toBeLessThanOrEqual(SEED_MEMBERS.length + SLOTS_BEYOND_MEMBER_COUNT);
  });
});

describe('the seeded charts', () => {
  it('gives every song a chart, so scene mode has something to show on a preview', () => {
    for (const song of SEED_SONGS) {
      expect(song.chordChartText.length).toBeGreaterThan(0);
    }
  });

  it('opens every chart on the ChordPro title directive of that song', () => {
    for (const song of SEED_SONGS) {
      const firstLine = song.chordChartText.split('\n')[0] ?? '';
      expect(firstLine).toBe(`{title: ${song.title}}`);
    }
  });

  it('writes at least one bracketed chord in every chart', () => {
    for (const song of SEED_SONGS) {
      expect(song.chordChartText).toMatch(/\[[^\]]+]/);
    }
  });

  it('gives the set enough chart to scroll through, which is what auto-scroll needs', () => {
    for (const song of SEED_SONGS) {
      expect(song.chordChartText.split('\n').length).toBeGreaterThan(10);
    }
  });
});

describe('the seeded setlist entries', () => {
  it('carries a key override, a capo and a note somewhere, so the scene header is exercised', () => {
    expect(SEED_SONGS.some((song) => song.entry.keyOverride !== null)).toBe(true);
    expect(SEED_SONGS.some((song) => song.entry.capo !== null)).toBe(true);
    expect(SEED_SONGS.some((song) => song.entry.notes !== '')).toBe(true);
  });

  it('falls back to an entry that overrides nothing', () => {
    expect(BLANK_ENTRY_DETAIL).toEqual({ keyOverride: null, capo: null, notes: '' });
  });
});

describe('the seeded transition comment', () => {
  it('says what the two songs around it need', () => {
    expect(SEED_TRANSITION_COMMENT.length).toBeGreaterThan(0);
  });
});
