import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FlameTone } from '../atoms/flame-mark.utils';
import { FlameChip } from './FlameChip';

const FLICKER = 'motion-safe:animate-flame-flicker';
const LABEL = 'Your flame, 5 days. Band flame, 12 days.';

function renderChip(bandTone: FlameTone, onPress = vi.fn()): HTMLElement {
  render(
    <FlameChip
      mineDays={5}
      mineTone="counted"
      bandDays={12}
      bandTone={bandTone}
      label={LABEL}
      onPress={onPress}
    />,
  );
  return screen.getByRole('button', { name: LABEL });
}

function readMarks(chip: HTMLElement): SVGElement[] {
  return [...chip.querySelectorAll<SVGElement>('svg[data-flame-mark]')];
}

// @FollowsBlueprint test-component-render
describe('FlameChip', () => {
  afterEach(() => {
    cleanup();
  });

  it('carries the blaze and my days, a rule, then the bonfire and the band’s days', () => {
    const onPress = vi.fn();
    const chip = renderChip('counted', onPress);
    expect(chip.textContent).toBe('512');
    expect(chip.getAttribute('title')).toBe(LABEL);
    const marks = readMarks(chip);
    expect(marks.map((mark) => mark.dataset.flameMark)).toEqual(['blaze', 'bonfire']);
    expect(marks.map((mark) => mark.dataset.tone)).toEqual(['counted', 'counted']);
    expect(marks.every((mark) => mark.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(chip.querySelector('span[aria-hidden="true"]')?.getAttribute('class')).toContain('w-px');
    fireEvent.click(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('flickers the bonfire while today counts for the band', () => {
    const [, bonfire] = readMarks(renderChip('counted'));
    expect(bonfire?.querySelectorAll('g')).toHaveLength(3);
    expect(bonfire?.getAttribute('class')).toContain(FLICKER);
  });

  it.each(['open', 'out'] as const)('keeps the band bonfire still while %s', (tone) => {
    const [, bonfire] = readMarks(renderChip(tone));
    expect(bonfire?.dataset.tone).toBe(tone);
    expect(bonfire?.getAttribute('class')).not.toContain(FLICKER);
    expect(bonfire?.getAttribute('class')).not.toContain('drop-shadow');
  });
});
