import { describe, expect, it } from 'vitest';
import { parseOpenings } from './parseOpenings.utils';

const validOpening = {
  id: 'italian',
  name: 'Italian Game',
  ecoCodes: ['C50'],
  variations: [
    {
      id: 'main',
      name: 'Main',
      lines: [
        {
          id: 'classical',
          name: 'Classical',
          eco: 'C50',
          movesSan: ['e4'],
          movesUci: ['e2e4'],
        },
      ],
    },
  ],
};

describe('parseOpenings', () => {
  it('parses a well-formed payload', () => {
    const result = parseOpenings([validOpening]);
    expect(result).toHaveLength(1);
    expect(result[0]?.variations[0]?.lines[0]?.movesUci).toEqual(['e2e4']);
  });

  it('rejects a non-array root', () => {
    expect(() => parseOpenings({})).toThrow(/root is not an array/);
  });

  it('rejects a non-object opening', () => {
    expect(() => parseOpenings(['nope'])).toThrow(/opening entry is not an object/);
  });

  it('rejects an opening missing id', () => {
    const broken = { ...validOpening, id: 42 };
    expect(() => parseOpenings([broken])).toThrow(/opening\.id is not a string/);
  });

  it('rejects a non-array ecoCodes', () => {
    const broken = { ...validOpening, ecoCodes: 'C50' };
    expect(() => parseOpenings([broken])).toThrow(/opening\.ecoCodes is not an array/);
  });

  it('rejects a non-string ecoCodes entry', () => {
    const broken = { ...validOpening, ecoCodes: [42] };
    expect(() => parseOpenings([broken])).toThrow(/opening\.ecoCodes\[0\] is not a string/);
  });

  it('rejects a non-array variations', () => {
    const broken = { ...validOpening, variations: 'main' };
    expect(() => parseOpenings([broken])).toThrow(/opening\.variations is not an array/);
  });

  it('rejects a non-object variation', () => {
    const broken = { ...validOpening, variations: ['oops'] };
    expect(() => parseOpenings([broken])).toThrow(/variation entry is not an object/);
  });

  it('rejects a malformed variation field', () => {
    const broken = {
      ...validOpening,
      variations: [{ id: 1, name: 'Main', lines: [] }],
    };
    expect(() => parseOpenings([broken])).toThrow(/variation\.id is not a string/);
  });

  it('rejects a non-array lines field', () => {
    const broken = {
      ...validOpening,
      variations: [{ id: 'main', name: 'Main', lines: 'oops' }],
    };
    expect(() => parseOpenings([broken])).toThrow(/variation\.lines is not an array/);
  });

  it('rejects a non-object line', () => {
    const broken = {
      ...validOpening,
      variations: [{ id: 'main', name: 'Main', lines: ['oops'] }],
    };
    expect(() => parseOpenings([broken])).toThrow(/line entry is not an object/);
  });

  it('rejects a malformed line.movesSan', () => {
    const broken = {
      ...validOpening,
      variations: [
        {
          id: 'main',
          name: 'Main',
          lines: [{ id: 'a', name: 'A', eco: 'C50', movesSan: [42], movesUci: ['e2e4'] }],
        },
      ],
    };
    expect(() => parseOpenings([broken])).toThrow(/line\.movesSan\[0\] is not a string/);
  });

  it('rejects an array given to expectStringArray', () => {
    const broken = {
      ...validOpening,
      variations: [
        {
          id: 'main',
          name: 'Main',
          lines: [{ id: 'a', name: 'A', eco: 'C50', movesSan: 'nope', movesUci: ['e2e4'] }],
        },
      ],
    };
    expect(() => parseOpenings([broken])).toThrow(/line\.movesSan is not an array/);
  });

  it('rejects null entries (non-object record)', () => {
    expect(() => parseOpenings([null])).toThrow(/opening entry is not an object/);
  });
});
