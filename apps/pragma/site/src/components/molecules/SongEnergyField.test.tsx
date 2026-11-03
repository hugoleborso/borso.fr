import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { SongEnergyField } from './SongEnergyField';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STORED_LEVEL = 7;
const DEFAULT_LEVEL = 5;

afterEach(cleanup);

// @FollowsBlueprint test-pure-unit
describe('SongEnergyField', () => {
  it('shows the level the song stores', () => {
    render(<SongEnergyField baseEnergy={STORED_LEVEL} onChange={vi.fn()} />);
    const meter = screen.getByRole('slider', { name: 'Base energy (1-10)' });
    expect(meter.getAttribute('aria-valuenow')).toBe(String(STORED_LEVEL));
    expect(meter.getAttribute('aria-valuetext')).toBeNull();
  });

  it('says the level is not set yet when the song stores none', () => {
    render(<SongEnergyField baseEnergy={null} onChange={vi.fn()} />);
    const meter = screen.getByRole('slider');
    expect(meter.getAttribute('aria-valuenow')).toBe(String(DEFAULT_LEVEL));
    expect(meter.getAttribute('aria-valuetext')).toBe(`Not set, showing ${DEFAULT_LEVEL}`);
  });

  it('reports the level the gesture asks for', async () => {
    const onChange = vi.fn();
    render(<SongEnergyField baseEnergy={STORED_LEVEL} onChange={onChange} />);
    screen.getByRole('slider').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(STORED_LEVEL + 1);
  });
});
