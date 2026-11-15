import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import type { DecisionPayload } from './proposal-board.core';
import { ProposalDecisionForm } from './ProposalDecisionForm';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const OPTIONS = ['mardi', 'jeudi', 'pas cette semaine'];

// @FollowsBlueprint test-component-render
describe('ProposalDecisionForm', () => {
  let container: HTMLDivElement;
  let root: Root;
  let decided: DecisionPayload[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    decided = [];
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderForm(options: readonly string[]): void {
    act(() => {
      root.render(
        <ProposalDecisionForm
          slug="2026-11-15-course"
          options={options}
          isPending={false}
          startsCommenting={false}
          onDecided={(payload) => decided.push(payload)}
        />,
      );
    });
  }

  function readButtonLabels(): string[] {
    return [...container.querySelectorAll('button')].map(
      (button) => button.getAttribute('aria-label') ?? button.textContent,
    );
  }

  function clickButton(label: string): void {
    const button = [...container.querySelectorAll('button')].find(
      (candidate) => candidate.textContent === label,
    );
    act(() => {
      button?.click();
    });
  }

  it('shows one button per option in the agent order, with Refuse and Comment and no Accept', () => {
    renderForm(OPTIONS);
    expect(readButtonLabels()).toEqual([
      'Commenter',
      'Refuser',
      'mardi',
      'jeudi',
      'pas cette semaine',
    ]);
  });

  it('lets the buttons wrap onto several lines on a narrow screen', () => {
    renderForm(OPTIONS);
    expect(container.querySelector('button')?.parentElement?.className).toContain('flex-wrap');
  });

  it('sends the tapped option as an acceptance, with the comment typed', async () => {
    renderForm(OPTIONS);
    act(() => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Commenter"]')?.click();
    });
    await userEvent.type(container.querySelector('textarea') ?? container, '  le soir ');
    clickButton('jeudi');
    expect(decided).toEqual([{ decision: 'acceptee', option: 'jeudi', comment: 'le soir' }]);
  });

  it('refuses without an option', () => {
    renderForm(OPTIONS);
    clickButton('Refuser');
    expect(decided).toEqual([{ decision: 'refusee' }]);
  });

  it('keeps Accept, Refuse and Comment on a proposal without options', () => {
    renderForm([]);
    expect(readButtonLabels()).toEqual(['Commenter', 'Refuser', 'Accepter']);
    clickButton('Accepter');
    expect(decided).toEqual([{ decision: 'acceptee' }]);
  });
});
