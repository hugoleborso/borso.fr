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
    expect(document.querySelector('[data-chord="D"]')?.textContent).toBe('Hello ');
  });
});

describe('a chord chart with lyrics', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows each chord without brackets, above the word it lands on', () => {
    const { container } = render(<ChordChartViewer source="So if you're [Am]lonely" />);
    expect(container.textContent).not.toContain('[');
    const cell = container.querySelector('[data-chord="Am"]');
    expect(cell?.textContent).toBe('lonely');
    expect(cell?.className).toContain('before:content-[attr(data-chord)]');
  });

  it('keeps the page text of a line to its lyrics, word for word', () => {
    const { container } = render(<ChordChartViewer source="[Cm]Take five, be[F]comes" />);
    expect(container.textContent).toBe('Take five, becomes');
  });

  it('widens a chord cell to its chord plus one gap, and leaves a bare word its own width', () => {
    const { container } = render(<ChordChartViewer source="[Cmaj7]a word" />);
    const cells = container.querySelectorAll<HTMLElement>('.indent-0');
    expect(cells[0]?.style.minWidth).toBe('6ch');
    expect(cells[1]?.style.minWidth).toBe('');
  });

  it('keeps a line of chords alone on one row, without an empty lyric row', () => {
    render(<ChordChartViewer source="[G]   [A]" />);
    expect(screen.getByText('G', { normalizer: (text) => text.trim() }).className).toContain(
      'font-semibold',
    );
    expect(document.querySelector('[data-chord]')).toBeNull();
  });
});
