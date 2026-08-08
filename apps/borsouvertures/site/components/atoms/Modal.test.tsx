import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

/**
 * jsdom ships no `<dialog>` implementation, so the two methods the component
 * calls are stubbed here. Mocking what cannot run is the one case
 * docs/standards/10-testing.md allows a mock for.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

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
