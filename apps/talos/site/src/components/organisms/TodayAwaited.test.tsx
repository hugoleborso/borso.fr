import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { TodayAwaited } from './TodayAwaited';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const AWAITED = [
  {
    path: 'engagements/retour-contrat',
    title: 'Retour du contrat',
    direction: 'awaited' as const,
    counterpartName: 'Camille Durand',
    action: 'Renvoyer le contrat signé',
    dueDate: '2026-11-10',
  },
  { path: 'engagements/devis-toiture', title: 'Devis toiture', direction: 'awaited' as const },
];

// @FollowsBlueprint test-component-render
describe('TodayAwaited', () => {
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

  it('folds what others owe the owner under a counter, closed until tapped', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <TodayAwaited commitments={AWAITED} today="2026-11-11" />
        </MemoryRouter>,
      );
    });
    expect(container.querySelector('details')?.open).toBe(false);
    expect(container.querySelector('summary')?.textContent).toBe('En attente · 2');
    expect(
      [...container.querySelectorAll('li a')].map((link) => link.getAttribute('href')),
    ).toEqual([
      '/commitments/engagements/retour-contrat',
      '/commitments/engagements/devis-toiture',
    ]);
    expect(container.querySelector('li')?.textContent).toContain(
      'Camille · Renvoyer le contrat signé',
    );
  });

  it('shows nothing when nobody owes anything', () => {
    act(() => {
      root.render(
        <MemoryRouter>
          <TodayAwaited commitments={[]} today="2026-11-11" />
        </MemoryRouter>,
      );
    });
    expect(container.innerHTML).toBe('');
  });
});
