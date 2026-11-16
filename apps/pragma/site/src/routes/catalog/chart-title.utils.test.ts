import { describe, expect, it } from 'vitest';
import { titleChordCharts, type TitledChart } from './chart-title.utils';

const SHARED_TITLES = { chords: 'Accords', ensemble: 'Ensemble' };
const INSTRUMENTS = [
  { id: 'voice', name: 'Chant' },
  { id: 'guitar', name: 'Guitare' },
  { id: 'bass', name: 'Basse' },
];

function readTitles(charts: readonly TitledChart[]): string[] {
  return titleChordCharts(charts, INSTRUMENTS, SHARED_TITLES).map(({ title }) => title);
}

// @FollowsBlueprint test-pure-unit
describe('titleChordCharts', () => {
  it('names a chart for one instrument after that instrument', () => {
    const charts = [
      { kind: 'chordpro', instrumentIds: ['voice', 'guitar'] },
      { kind: 'pdf', instrumentIds: ['bass'] },
    ];
    expect(readTitles(charts)).toEqual(['Accords', 'Basse']);
  });

  it('reads Accords for a ChordPro chart for every instrument', () => {
    const charts = [{ kind: 'chordpro', instrumentIds: [] }];
    expect(readTitles(charts)).toEqual(['Accords']);
  });

  it('reads Ensemble for a file chart shared by several instruments or all', () => {
    const charts = [
      { kind: 'pdf', instrumentIds: ['voice', 'guitar'] },
      { kind: 'image', instrumentIds: [] },
    ];
    expect(readTitles(charts)).toEqual(['Ensemble', 'Ensemble 2']);
  });

  it('pairs each title with its chart, in order', () => {
    const bassChart = { kind: 'pdf', instrumentIds: ['bass'] };
    expect(titleChordCharts([bassChart], INSTRUMENTS, SHARED_TITLES)).toEqual([
      { chart: bassChart, title: 'Basse' },
    ]);
  });

  it('counts only the instruments that still exist', () => {
    const charts = [
      { kind: 'pdf', instrumentIds: ['gone', 'bass'] },
      { kind: 'pdf', instrumentIds: ['gone'] },
    ];
    expect(readTitles(charts)).toEqual(['Basse', 'Ensemble']);
  });

  it('numbers a repeated title from its second chart on', () => {
    const charts = [
      { kind: 'chordpro', instrumentIds: ['bass'] },
      { kind: 'chordpro', instrumentIds: [] },
      { kind: 'pdf', instrumentIds: ['bass'] },
      { kind: 'image', instrumentIds: ['bass'] },
    ];
    expect(readTitles(charts)).toEqual(['Basse', 'Accords', 'Basse 2', 'Basse 3']);
  });
});
