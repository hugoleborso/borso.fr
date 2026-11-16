import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { ChordChartSwitcher, type SwitchableChart } from './ChordChartSwitcher';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const INSTRUMENTS = [
  { id: 'guitar', name: 'Guitare' },
  { id: 'piano', name: 'Clavier' },
];
const EVERY_INSTRUMENT: SwitchableChart = { kind: 'chordpro', instrumentIds: [], label: null };
const GUITAR_SOLO: SwitchableChart = { kind: 'pdf', instrumentIds: ['guitar'], label: 'Solo' };

function listTabs(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[role=tab]')];
}

// @FollowsBlueprint test-component-render
describe('ChordChartSwitcher', () => {
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

  it('names one pill per chart in one word, the shown one selected', () => {
    act(() => {
      root.render(
        <ChordChartSwitcher
          charts={[EVERY_INSTRUMENT, GUITAR_SOLO]}
          instruments={INSTRUMENTS}
          shownIndex={1}
          onPick={vi.fn()}
        />,
      );
    });
    expect(document.querySelector('[role=tablist]')?.getAttribute('aria-label')).toBe(
      'Charts of this song',
    );
    expect(listTabs().map((tab) => tab.textContent)).toEqual(['Chords', 'Guitare']);
    expect(listTabs().map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true']);
  });

  it('answers the index of the pill tapped', () => {
    const onPick = vi.fn();
    act(() => {
      root.render(
        <ChordChartSwitcher
          charts={[EVERY_INSTRUMENT, GUITAR_SOLO]}
          instruments={INSTRUMENTS}
          shownIndex={1}
          onPick={onPick}
          tone="stage"
        />,
      );
    });
    act(() => {
      listTabs()[0]?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      listTabs()[0]?.click();
    });
    expect(onPick).toHaveBeenCalledWith(0);
  });

  it('draws nothing for a song with one chart', () => {
    act(() => {
      root.render(
        <ChordChartSwitcher
          charts={[EVERY_INSTRUMENT]}
          instruments={INSTRUMENTS}
          shownIndex={0}
          onPick={vi.fn()}
        />,
      );
    });
    expect(container.innerHTML).toBe('');
  });
});
