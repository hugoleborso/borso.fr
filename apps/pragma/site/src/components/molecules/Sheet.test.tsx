import { fireEvent } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { Button } from '../atoms/Button';
import { Sheet } from './Sheet';
import { SWIPE_CLOSE_DISTANCE_PX } from './sheet-swipe.utils';
import { stubSheetDialog } from './sheet.test-utils';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TITLE = 'Lineup (this set)';
const CLOSE_LABEL_EN = 'Close';

function renderSheet(root: Root, node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

/**
 * @Blueprint test-component-render
 * @BlueprintName Component Render Test
 * @BlueprintUsage Use for asserting what a user sees and what their click does, rather than what the component called.
 * @BlueprintDescription Mounts the component for real with `createRoot` inside `act`, imports the application's i18n setup so the assertions read the shipped catalogue instead of a stub, and finds each control by its visible text or its accessible name before reading the aria state a screen reader would announce. A fresh container and root are built and torn down per case, so no test inherits the previous tree.
 */
describe('Sheet', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    stubSheetDialog();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens with its title, a named Close button, one scroll body and its footer', () => {
    renderSheet(
      root,
      <Sheet
        title={TITLE}
        label={TITLE}
        onClose={vi.fn()}
        footer={<Button icon="check">Save</Button>}
      >
        <p>Body</p>
      </Sheet>,
    );
    const dialog = container.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
    expect(dialog?.getAttribute('aria-label')).toBe(TITLE);
    expect(container.querySelector('h2')?.textContent).toBe(TITLE);
    expect(container.querySelector('[data-sheet-close]')?.getAttribute('aria-label')).toBe(
      CLOSE_LABEL_EN,
    );
    expect(container.querySelectorAll('[data-sheet-body]')).toHaveLength(1);
    expect(container.querySelector('footer')?.textContent).toBe('Save');
  });

  it('keeps a subheader outside the scroll body, so it stays in view', () => {
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={vi.fn()} subheader={<p>Key and capo</p>}>
        <p>Body</p>
      </Sheet>,
    );
    const subheader = Array.from(container.querySelectorAll('p')).find(
      (paragraph) => paragraph.textContent === 'Key and capo',
    );
    expect(subheader?.closest('[data-sheet-body]')).toBeNull();
    expect(subheader?.closest('dialog')).not.toBeNull();
  });

  it('puts the focus in the first field rather than on Close', () => {
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={vi.fn()}>
        <textarea aria-label="Notes" />
      </Sheet>,
    );
    expect(document.activeElement?.tagName).toBe('TEXTAREA');
  });

  it('calls onClose from the Close button', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    act(() => container.querySelector<HTMLButtonElement>('[data-sheet-close]')?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('wraps the body and the footer in one form when it submits', () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    renderSheet(
      root,
      <Sheet
        title={TITLE}
        label={TITLE}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        footer={
          <Button type="submit" icon="check">
            Save
          </Button>
        }
      >
        <input aria-label="Name" />
      </Sheet>,
    );
    const form = container.querySelector('form');
    expect(form?.querySelector('[data-sheet-body]')).not.toBeNull();
    expect(form?.querySelector('footer')).not.toBeNull();
    act(() => form?.querySelector<HTMLButtonElement>('button[type=submit]')?.click());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('sets a record name in the display face and a tool title in the sans face', () => {
    renderSheet(
      root,
      <Sheet title="Superstition" label="Superstition" isTitleARecordName onClose={vi.fn()}>
        <p>Body</p>
      </Sheet>,
    );
    expect(container.querySelector('h2')?.className).toContain('font-display');
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={vi.fn()}>
        <p>Body</p>
      </Sheet>,
    );
    expect(container.querySelector('h2')?.className).toContain('font-sans');
  });

  function swipeGrabber(fromY: number, toY: number): void {
    const grabber = container.querySelector<HTMLElement>('[data-sheet-grab]');
    if (grabber === null) throw new Error('no grabber');
    act(() => {
      fireEvent.touchStart(grabber, { touches: [{ clientY: fromY }] });
      fireEvent.touchMove(grabber, { touches: [{ clientY: toY }] });
      fireEvent.touchEnd(grabber, { touches: [] });
    });
  }

  it('closes when the grabber is swiped down past the threshold', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    swipeGrabber(100, 100 + SWIPE_CLOSE_DISTANCE_PX);
    expect(onClose).toHaveBeenCalledOnce();
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(false);
  });

  it('springs back to its place on a short swipe', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    swipeGrabber(100, 100 + SWIPE_CLOSE_DISTANCE_PX - 1);
    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector('dialog')?.style.transform).toBe('');
  });

  it('shows no grabber and ignores a swipe on a sheet that cannot be dismissed', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose} isDismissible={false}>
        <p>Body</p>
      </Sheet>,
    );
    expect(container.querySelector('[data-sheet-grabber]')).toBeNull();
    swipeGrabber(100, 400);
    expect(onClose).not.toHaveBeenCalled();
  });
});
