import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { FlameChip } from './FlameChip';

const COUNTED_DAYS = 12;

// @FollowsBlueprint test-component-render
describe('FlameChip', () => {
  afterEach(() => {
    cleanup();
  });

  it('names the count and the state of today, and answers a press', () => {
    const onPress = vi.fn();
    const label = i18next.t('streaks.mineChip', {
      count: COUNTED_DAYS,
      status: i18next.t('streaks.todayCounted'),
    });
    render(
      <FlameChip
        glyph="flame"
        days={COUNTED_DAYS}
        tone="counted"
        label={label}
        onPress={onPress}
      />,
    );
    const chip = screen.getByRole('button', { name: 'Your flame, 12 days, today counted' });
    expect(chip.textContent).toBe('12');
    expect(chip.querySelector('svg')?.getAttribute('class')).toContain('fill-accent');
    fireEvent.click(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('greys out the band glyph of a flame at zero', () => {
    render(
      <FlameChip
        glyph="members"
        days={0}
        tone="out"
        label={i18next.t('streaks.bandChip', { count: 0 })}
        onPress={vi.fn()}
      />,
    );
    const chip = screen.getByRole('button', { name: 'Band flame, 0 days' });
    expect(chip.querySelector('svg')?.getAttribute('class')).toContain('text-ink-faint');
  });
});
