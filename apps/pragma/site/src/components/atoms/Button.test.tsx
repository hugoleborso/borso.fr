import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LABEL = 'Morceau suivant';

// @FollowsBlueprint test-component-render
describe('a pill whose label shows on wide screens only', () => {
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

  function renderPill(node: React.ReactNode): HTMLElement | null {
    act(() => root.render(<MemoryRouter>{node}</MemoryRouter>));
    return container.querySelector('button, a');
  }

  it('turns into a round icon on a phone and keeps its label for screen readers', () => {
    for (const pill of [
      renderPill(
        <Button icon="chevR" labelDisplay="wide-only">
          {LABEL}
        </Button>,
      ),
      renderPill(
        <ButtonLink icon="chevR" labelDisplay="wide-only" to="/">
          {LABEL}
        </ButtonLink>,
      ),
    ]) {
      expect(pill?.className).toContain('max-sm:w-11');
      expect(pill?.querySelector('span')?.className).toBe('max-sm:sr-only');
      expect(pill?.textContent).toBe(LABEL);
    }
  });

  it('shows its label at every width by default', () => {
    const pill = renderPill(<Button icon="chevR">{LABEL}</Button>);
    expect(pill?.className).not.toContain('max-sm:');
    expect(pill?.querySelector('span')).toBeNull();
    expect(pill?.textContent).toBe(LABEL);
  });
});
