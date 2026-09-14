import { describe, expect, it } from 'vitest';
import { selectEnrolmentWindow, suggestUsername } from './enrolment.core';

const ADA = { memberId: 'member-ada', firstName: 'Ada' };
const GRACE = { memberId: 'member-grace', firstName: 'Grace' };

// @FollowsBlueprint test-pure-unit
describe('enrolment.core', () => {
  it('offers every member while nobody is enrolled', () => {
    expect(selectEnrolmentWindow([ADA, GRACE], [])).toEqual({
      kind: 'open',
      candidates: [ADA, GRACE],
    });
  });

  it('offers only the members without a credential', () => {
    expect(selectEnrolmentWindow([ADA, GRACE], [ADA.memberId])).toEqual({
      kind: 'open',
      candidates: [GRACE],
    });
  });

  it('closes the window once every member is enrolled', () => {
    expect(selectEnrolmentWindow([ADA, GRACE], [ADA.memberId, GRACE.memberId])).toEqual({
      kind: 'closed',
    });
  });

  it('closes the window when the band has no members at all', () => {
    expect(selectEnrolmentWindow([], [])).toEqual({ kind: 'closed' });
  });

  it('suggests the first name lowercased', () => {
    expect(suggestUsername('Ada', [])).toBe('ada');
  });

  it('strips accents and punctuation', () => {
    expect(suggestUsername('Jean-Éric', [])).toBe('jeaneric');
  });

  it('suffixes a name another member already holds', () => {
    expect(suggestUsername('Ada', ['ada'])).toBe('ada2');
    expect(suggestUsername('Ada', ['ada', 'ada2'])).toBe('ada3');
  });

  it('suggests nothing when the first name carries no usable character', () => {
    expect(suggestUsername('***', [])).toBe('');
  });
});

describe('suggestUsername trims what it is handed', () => {
  it('drops the spaces around a first name', () => {
    expect(suggestUsername('  Ada  ', [])).toBe('ada');
  });

  it('keeps suffixing even when the usable part is empty', () => {
    expect(suggestUsername('***', ['', '2'])).toBe('3');
  });
});
