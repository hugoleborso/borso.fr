import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { InstrumentToggleGroup } from './InstrumentToggleGroup';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const INSTRUMENTS = [
  { id: 'guitar', name: 'Guitare', icon: 'guitar' },
  { id: 'piano', name: 'Clavier', icon: 'piano' },
  { id: 'bass', name: 'Basse', icon: 'bass' },
] as const;

function getChip(name: string): HTMLButtonElement {
  const chip = [...document.querySelectorAll('button')].find(
    (button) => button.getAttribute('aria-label') === name,
  );
  if (chip === undefined) throw new Error(`no chip ${name}`);
  return chip;
}

// @FollowsBlueprint test-component-render
describe('InstrumentToggleGroup', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows one chip per instrument under its label, pressed for each picked one', () => {
    act(() => {
      root.render(
        <InstrumentToggleGroup
          label="For"
          instruments={INSTRUMENTS}
          selectedIds={['piano']}
          onChange={vi.fn()}
        />,
      );
    });
    expect(document.querySelector('[role=toolbar], [role=group]')?.getAttribute('aria-label')).toBe(
      'For',
    );
    expect(getChip('Clavier').getAttribute('aria-pressed')).toBe('true');
    expect(getChip('Guitare').getAttribute('aria-pressed')).toBe('false');
  });

  it('answers the picked instruments in instrument order when a chip is tapped', () => {
    const onChange = vi.fn();
    act(() => {
      root.render(
        <InstrumentToggleGroup
          label="For"
          instruments={INSTRUMENTS}
          selectedIds={['bass']}
          onChange={onChange}
        />,
      );
    });
    act(() => getChip('Guitare').click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith(['guitar', 'bass']);
  });

  it('draws a specific glyph alone and writes the name beside the generic one', () => {
    act(() => {
      root.render(
        <InstrumentToggleGroup
          label="For"
          instruments={[...INSTRUMENTS, { id: 'kazoo', name: 'Kazoo', icon: 'music' }]}
          selectedIds={[]}
          onChange={vi.fn()}
        />,
      );
    });
    expect(getChip('Guitare').textContent).toBe('');
    expect(getChip('Guitare').querySelector('[title="Guitare"] svg')).not.toBeNull();
    expect(getChip('Kazoo').textContent).toBe('Kazoo');
  });
});
