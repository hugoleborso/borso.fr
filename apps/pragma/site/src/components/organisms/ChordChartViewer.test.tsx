import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { ChordChartViewer } from './ChordChartViewer';

const CHART_WITH_A_RIFF = [
  '[C]Hello [G]there',
  '{start_of_tab}',
  '   Em        C',
  'e|-----0-----|-----0------|',
  '{end_of_tab}',
].join('\n');

function closestElement(text: string, selector: string): HTMLElement {
  const element = screen.getByText(text).closest<HTMLElement>(selector);
  if (element === null) throw new Error(`no ${selector} around ${text}`);
  return element;
}

// @FollowsBlueprint test-component-render
describe('a chord chart holding a tab', () => {
  afterEach(() => {
    cleanup();
  });

  it('heads the tab block with its badge and shows each staff line on one unbroken line', () => {
    render(<ChordChartViewer source={CHART_WITH_A_RIFF} tone="dark" />);
    expect(screen.getByText('Tab')).toBeDefined();
    const staff = screen.getByText('e|-----0-----|-----0------|');
    expect(staff.className).toContain('whitespace-pre');
    expect(staff.className).not.toContain('whitespace-pre-wrap');
  });

  it('lets the tab block scroll sideways instead of wrapping its columns', () => {
    render(<ChordChartViewer source={CHART_WITH_A_RIFF} tone="dark" />);
    expect(closestElement('e|-----0-----|-----0------|', '.overflow-x-auto')).toBeDefined();
  });

  it('transposes the frets and the chord line of the tab along with the song', () => {
    render(<ChordChartViewer source={CHART_WITH_A_RIFF} semitones={2} tone="dark" />);
    expect(screen.getByText('   F#m       D', { normalizer: (text) => text })).toBeDefined();
    expect(screen.getByText('e|-----2-----|-----2------|')).toBeDefined();
    expect(screen.getByText('D')).toBeDefined();
  });
});

describe('a chord chart with lyrics', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows each chord without brackets, stacked above the word it lands on', () => {
    render(<ChordChartViewer source="So if you're [Am]lonely" />);
    expect(screen.queryByText('[Am]')).toBeNull();
    const chord = screen.getByText('Am');
    expect(chord.nextElementSibling?.textContent).toBe('lonely');
    expect(chord.parentElement?.className).toContain('flex-col');
  });

  it('adds no text over a word that carries no chord, so the line reads as written', () => {
    const { container } = render(<ChordChartViewer source="[Cm]Take five" />);
    expect(container.textContent).toBe('CmTake five');
  });

  it('keeps a line of chords alone on one row, without an empty lyric row', () => {
    render(<ChordChartViewer source="[G]   [A]" />);
    expect(screen.getByText('G', { normalizer: (text) => text.trim() }).className).toContain(
      'font-semibold',
    );
    expect(document.querySelector('.flex-col')).toBeNull();
  });
});
