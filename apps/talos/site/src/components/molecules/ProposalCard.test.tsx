import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import { ProposalCard } from './ProposalCard';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @FollowsBlueprint test-component-render
describe('ProposalCard', () => {
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

  it('shows the exact draft in a preformatted block, keeping its line breaks', () => {
    act(() => {
      root.render(
        <ProposalCard
          title="Déplacer le bloc Umbrella"
          categoryLabel="Action"
          priorityLabel="Priorité haute"
          priorityTone="danger"
          dateLabel="Expire le lun. 5 oct."
          whyHtml="<p>Conflit avec l'appel</p>"
          draft={'Bonjour,\nje décale.'}
          onLongPress={() => undefined}
        >
          <button type="button">slot</button>
        </ProposalCard>,
      );
    });
    expect(container.querySelector('h2')?.textContent).toBe('Déplacer le bloc Umbrella');
    expect(container.querySelector('pre')?.textContent).toBe('Bonjour,\nje décale.');
    expect(container.textContent).toContain("Conflit avec l'appel");
    expect(container.textContent).toContain('Brouillon');
    expect(container.querySelector('button')?.textContent).toBe('slot');
  });
});
