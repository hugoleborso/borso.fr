import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

/**
 * jsdom ships no `<dialog>` implementation, so the two methods the component
 * calls are stubbed here. Mocking what cannot run is the one case
 * docs/standards/10-testing.md allows a mock for.
 *
 * @Blueprint test-jsdom-gap-stub
 * @BlueprintName jsdom Gap Stub
 * @BlueprintUsage Use when a component calls a browser API the test environment does not implement, and only then.
 * @BlueprintDescription Installs the missing methods on the prototype inside `beforeAll`, giving each the smallest behaviour the assertions depend on, here flipping the `open` property so the dialog role appears in the tree. The comment above names the standard that permits the stub and says which environment gap it fills, which is what separates it from mocking code that could have run for real. Stubbing the prototype rather than the instance means the component still constructs its own element and the test asserts on the rendered result rather than on the call.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

// @FollowsBlueprint test-component-render
describe('Modal', () => {
  it('opens as a modal dialog as soon as it is rendered', () => {
    render(
      <Modal title="Out of book" closeLabel="Close" onClose={vi.fn()}>
        <p>That move is not in this variation.</p>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Out of book' })).toBeTruthy();
  });

  it('shows the children it was given', () => {
    render(
      <Modal title="Out of book" closeLabel="Close" onClose={vi.fn()}>
        <p>That move is not in this variation.</p>
      </Modal>,
    );
    expect(screen.getByText('That move is not in this variation.')).toBeTruthy();
  });

  it('closes when the user activates the close button', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Out of book" closeLabel="Close" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
