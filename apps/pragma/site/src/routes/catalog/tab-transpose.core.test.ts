import { describe, expect, it } from 'vitest';
import { parseChordPro } from '../../lib/chordpro.utils';
import {
  transposeChordChart,
  transposeFret,
  transposeTabChordLine,
  transposeTabLines,
  transposeTabSystem,
} from './tab-transpose.core';

const GUITAR_SYSTEM = [
  'e|-----0-----|-----3------|',
  'B|---0---0---|---1---1----|',
  'G|-9---------|-10---------|',
  'D|-----------|------------|',
];

// @FollowsBlueprint test-pure-unit
describe('transposeFret', () => {
  it('shifts a fret by the semitones', () => {
    expect(transposeFret(3, 2)).toBe(5);
    expect(transposeFret(12, -5)).toBe(7);
  });

  it('keeps a fret that lands on the open string', () => {
    expect(transposeFret(2, -2)).toBe(0);
  });

  it('moves a fret that would fall below the open string up an octave', () => {
    expect(transposeFret(0, -1)).toBe(11);
    expect(transposeFret(0, -11)).toBe(1);
  });
});

describe('transposeTabSystem', () => {
  it('pads every string where a fret gains a digit, so each note keeps its column', () => {
    expect(transposeTabSystem(GUITAR_SYSTEM, 2).lines).toEqual([
      'e|------2-----|-----5------|',
      'B|----2---2---|---3---3----|',
      'G|-11---------|-12---------|',
      'D|------------|------------|',
    ]);
  });

  it('moves the open strings up an octave when transposing down', () => {
    expect(transposeTabSystem(GUITAR_SYSTEM, -2).lines).toEqual([
      'e|------10------|-----1-------|',
      'B|---10----10---|--11---11----|',
      'G|-7------------|-8-----------|',
      'D|--------------|-------------|',
    ]);
  });

  it('leaves the system as written when the semitones are zero', () => {
    expect(transposeTabSystem(GUITAR_SYSTEM, 0).lines).toEqual(GUITAR_SYSTEM);
  });

  it('trims the filler on every string where a fret loses a digit', () => {
    expect(transposeTabSystem(['e|--10--3--|', 'B|---------|'], -2).lines).toEqual([
      'e|--8--1--|',
      'B|--------|',
    ]);
  });

  it('keeps a bass system aligned when one string grows and another shrinks at the same column', () => {
    expect(
      transposeTabSystem(['G|--0--2--|', 'D|--2--4--|', 'A|--------|', 'E|--------|'], -3).lines,
    ).toEqual(['G|--9---11--|', 'D|--11--1---|', 'A|----------|', 'E|----------|']);
  });

  it('shifts the numbers around every technique and keeps the string names and bar lines', () => {
    const [staff] = transposeTabSystem(
      ['D#|--3h5--5p3--7/9--9\\7--12b14--(5)--<12>--x--0--|'],
      3,
    ).lines;
    expect(staff).toBe('D#|--6h8--8p6--10/12--12\\10--15b17--(8)--<15>--x--3--|');
  });

  it('treats notes that overlap across strings as one column', () => {
    expect(transposeTabSystem(['e|-10--|', 'B|--12-|'], -9).lines).toEqual(['e|-1--|', 'B|--3-|']);
  });

  it('treats notes that only touch across strings as two columns', () => {
    expect(transposeTabSystem(['e|10---|', 'B|--3--|'], -2).lines).toEqual(['e|8---|', 'B|-1--|']);
  });

  it('trims a whole run of filler on a string with no note in a wide column', () => {
    expect(transposeTabSystem(['e|-10---|', 'B|10-10-|', 'G|------|'], -2).lines).toEqual([
      'e|-8--|',
      'B|8-8-|',
      'G|----|',
    ]);
  });

  it('never extends a string that ends before a later column', () => {
    expect(transposeTabSystem(['e|-0-|-', 'B|-0-|-3-|'], 1).lines).toEqual([
      'e|-1-|-',
      'B|-1-|-4-|',
    ]);
  });

  it('reports each column it rewrote and its new width', () => {
    expect(transposeTabSystem(['e|-9-|'], 1)).toEqual({
      lines: ['e|-10-|'],
      clusters: [{ start: 3, end: 4, width: 2 }],
    });
  });

  it('aligns notes by their column on screen when the string names differ in width', () => {
    expect(transposeTabSystem(['Eb|-9--|', 'A|--9--|'], 1).lines).toEqual([
      'Eb|-10--|',
      'A|--10--|',
    ]);
  });

  it('keeps a repeat count after the last bar line as written', () => {
    expect(transposeTabSystem(['G|-0-------0-|  x2', 'D|-x--12-----|'], 1).lines).toEqual([
      'G|-1-------1-|  x2',
      'D|-x--13-----|',
    ]);
  });
});

describe('transposeTabChordLine', () => {
  it('transposes each chord in place when no system sits below', () => {
    expect(transposeTabChordLine('Em   C  |  G', 2, null)).toBe('F#m  D  |  A');
  });

  it('keeps a space between two chords that grow into each other', () => {
    expect(transposeTabChordLine('C D', 1, null)).toBe('C# D#');
  });

  it('follows the columns the system below moved', () => {
    const system = transposeTabSystem(['e|-9---0--|'], 2);
    expect(transposeTabChordLine('   Em   C', 2, system)).toBe('   F#m   D');
  });
});

describe('transposeTabLines', () => {
  it('keeps the chord line above the staves column for column', () => {
    expect(transposeTabLines(['   Em        C', ...GUITAR_SYSTEM], 2)).toEqual([
      '   F#m        D',
      'e|------2-----|-----5------|',
      'B|----2---2---|---3---3----|',
      'G|-11---------|-12---------|',
      'D|------------|------------|',
    ]);
  });

  it('transposes a tab written with single dashes inside a tab block', () => {
    expect(transposeTabLines(['e|-3h5-5p3-|', 'B|-1---1---|'], 2)).toEqual([
      'e|-5h7-7p5-|',
      'B|-3---3---|',
    ]);
  });

  it('keeps a line that is neither a staff nor chords as written', () => {
    expect(transposeTabLines(['Palm mute, let ring', 'e|--9--|'], 1)).toEqual([
      'Palm mute, let ring',
      'e|--10--|',
    ]);
  });

  it('leaves the chord line columns alone when text separates it from the staves', () => {
    expect(transposeTabLines(['     C', 'x4', 'e|-9---|'], 2)).toEqual([
      '     D',
      'x4',
      'e|-11---|',
    ]);
  });

  it('aligns the staves after a line of text as one system', () => {
    expect(transposeTabLines(['e|-9--|', 'riff', 'e|-0--|', 'B|-2--|'], -1)).toEqual([
      'e|-8--|',
      'riff',
      'e|-11--|',
      'B|-1---|',
    ]);
  });

  it('reads each run of staves as its own system', () => {
    expect(transposeTabLines(['e|-9--|', 'riff', 'e|-0--|'], 1)).toEqual([
      'e|-10--|',
      'riff',
      'e|-1--|',
    ]);
  });
});

describe('transposeChordChart', () => {
  it('transposes the chords, the key and the tab block together', () => {
    const chart = parseChordPro('{key: C}\n[C]Hi\n{sot}\n  C\ne|-9--|\n\ne|-0--|\n{eot}');
    expect(transposeChordChart(chart, 2)).toEqual([
      { kind: 'directive', name: 'key', value: 'D' },
      {
        kind: 'chord-line',
        tokens: [
          { kind: 'chord', chord: 'D' },
          { kind: 'lyric', text: 'Hi' },
        ],
      },
      { kind: 'directive', name: 'sot', value: '' },
      { kind: 'tab-line', text: '  D' },
      { kind: 'tab-line', text: 'e|-11--|' },
      { kind: 'blank' },
      { kind: 'tab-line', text: 'e|-2--|' },
      { kind: 'directive', name: 'eot', value: '' },
    ]);
  });
});
