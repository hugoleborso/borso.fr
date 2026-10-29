import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { FlameChip } from './FlameChip';

const COUNTED_DAYS = 12;
const FLICKER = 'motion-safe:animate-flame-flicker';

function readMark(chip: HTMLElement): SVGElement | null {
  return chip.querySelector('svg[data-flame-mark]');
}

// @FollowsBlueprint test-component-render
describe('FlameChip', () => {
  afterEach(() => {
    cleanup();
  });

  it('names the count and the state of today, draws the blaze, and answers a press', () => {
    const onPress = vi.fn();
    const label = i18next.t('streaks.mineChip', {
      count: COUNTED_DAYS,
      status: i18next.t('streaks.todayCounted'),
    });
    render(
      <FlameChip
        scope="personal"
        days={COUNTED_DAYS}
        tone="counted"
        label={label}
        onPress={onPress}
      />,
    );
    const chip = screen.getByRole('button', { name: 'Your flame, 12 days, today counted' });
    expect(chip.textContent).toBe('12');
    const mark = readMark(chip);
    expect(mark?.dataset.flameMark).toBe('blaze');
    expect(mark?.dataset.tone).toBe('counted');
    expect(mark?.getAttribute('aria-hidden')).toBe('true');
    expect(mark?.querySelectorAll('circle')).toHaveLength(3);
    expect(mark?.getAttribute('class')).not.toContain(FLICKER);
    fireEvent.click(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws the bonfire for the band, flickering while today counts', () => {
    render(
      <FlameChip
        scope="band"
        days={4}
        tone="counted"
        label={i18next.t('streaks.bandChip', { count: 4 })}
        onPress={vi.fn()}
      />,
    );
    const mark = readMark(screen.getByRole('button', { name: 'Band flame, 4 days' }));
    expect(mark?.dataset.flameMark).toBe('bonfire');
    expect(mark?.querySelectorAll('g')).toHaveLength(3);
    expect(mark?.getAttribute('class')).toContain(FLICKER);
  });

  it.each(['open', 'out'] as const)('keeps the band bonfire still while %s', (tone) => {
    render(
      <FlameChip
        scope="band"
        days={0}
        tone={tone}
        label={i18next.t('streaks.bandChip', { count: 0 })}
        onPress={vi.fn()}
      />,
    );
    const mark = readMark(screen.getByRole('button', { name: 'Band flame, 0 days' }));
    expect(mark?.dataset.tone).toBe(tone);
    expect(mark?.getAttribute('class')).not.toContain(FLICKER);
    expect(mark?.getAttribute('class')).not.toContain('drop-shadow');
  });
});
