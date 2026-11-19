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

  it('keeps a word split by a chord in one unbreakable group, so a wrap never cuts it', () => {
    const { container } = render(<ChordChartViewer source="half be[F]comes" />);
    const word = container.querySelector('[data-chord="F"]')?.parentElement;
    expect(word?.className).toBe('whitespace-nowrap');
    expect(word?.textContent).toBe('becomes');
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

const CHART_WITH_A_SOLO = [
  '[C]Hello [G]there',
  '{comment: Solo}',
  '{comment: Hugo takes two rounds}',
  '[Am] [E] [Dm] [Am]',
  '{comment: Bridge}',
].join('\n');

describe('a chord chart holding a solo', () => {
  afterEach(() => {
    cleanup();
  });

  it('heads the solo with an outlined badge and keeps the rows inside its section', () => {
    render(<ChordChartViewer source={CHART_WITH_A_SOLO} tone="dark" />);
    const frame = closestElement('Solo', 'section');
    expect(screen.getByText('Solo').className).toContain('border-stage-chord');
    expect(screen.getByText('Solo').className).not.toContain('bg-stage-chord');
    expect(frame.textContent).toContain('Am');
    expect(frame.textContent).not.toContain('Hello');
    expect(frame.textContent).not.toContain('Bridge');
  });

  it('shows a note on the solo in full-strength text, not as a dim comment', () => {
    render(<ChordChartViewer source={CHART_WITH_A_SOLO} />);
    const note = screen.getByText('Hugo takes two rounds');
    expect(note.className).toContain('text-ink');
    expect(note.className).not.toContain('italic');
    expect(screen.getByText('Solo').className).toContain('border-accent');
  });

  it('keeps a comment outside the solo dim and italic', () => {
    render(<ChordChartViewer source={CHART_WITH_A_SOLO} />);
    expect(screen.getByText('Bridge').className).toContain('italic');
  });
});

describe('a chord chart read section by section', () => {
  afterEach(() => {
    cleanup();
  });

  it('shades every other section, starting with the second', () => {
    render(<ChordChartViewer source={CHART_WITH_A_SOLO} tone="dark" />);
    const sections = Array.from(document.querySelectorAll('section'));
    expect(sections.map((section) => section.className.includes('bg-stage-hover'))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('shades with the paper tone on a light chart', () => {
    render(<ChordChartViewer source={CHART_WITH_A_SOLO} />);
    expect(closestElement('Solo', 'section').className).toContain('bg-sunk');
  });
});

describe('a chord chart with bar lines and bare chord names', () => {
  afterEach(() => {
    cleanup();
  });

  it('writes chords between bar lines on the same line, not above them', () => {
    render(<ChordChartViewer source="| [Dm] | [G] | x2" tone="dark" />);
    expect(document.querySelector('[data-chord]')).toBeNull();
    expect(document.body.textContent).toContain('Dm');
  });

  it('colours chord names written without brackets on a line with no lyric', () => {
    render(<ChordChartViewer source="Am F#m Cmaj7 | x3 (guitar)" tone="dark" />);
    expect(screen.getByText('F#m').className).toContain('text-stage-chord');
    expect(screen.getByText('Cmaj7').className).toContain('text-stage-chord');
  });

  it('leaves a lyric line that holds a chord-shaped word as plain text', () => {
    render(<ChordChartViewer source="Am I the only one" tone="dark" />);
    expect(screen.getByText('Am I the only one').className).not.toContain('text-stage-chord');
  });
});
