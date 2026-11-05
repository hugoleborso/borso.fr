import { fireEvent } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { Button } from '../atoms/Button';
import { Sheet } from './Sheet';
import { SWIPE_CLOSE_DISTANCE_PX } from './sheet-swipe.utils';
import { pressEscapeInSheet, tapSheetScrim } from './sheet.test-utils';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TITLE = 'Lineup (this set)';
const CLOSE_LABEL_EN = 'Close';
const IPHONE_PLATFORM = 'iPhone';
const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

function renderSheet(root: Root, node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function swipeGrabber(fromY: number, toY: number): void {
  const grabber = document.querySelector<HTMLElement>('[data-sheet-grab]');
  if (grabber === null) throw new Error('no grabber');
  act(() => {
    fireEvent.touchStart(grabber, { touches: [{ clientY: fromY }] });
    fireEvent.touchMove(grabber, { touches: [{ clientY: toY }] });
    fireEvent.touchEnd(grabber, { touches: [] });
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
    const dialog = document.querySelector('[role=dialog]');
    expect(dialog?.getAttribute('aria-label')).toBe(TITLE);
    expect(document.querySelector('h2')?.textContent).toBe(TITLE);
    expect(document.querySelector('[data-sheet-close]')?.getAttribute('aria-label')).toBe(
      CLOSE_LABEL_EN,
    );
    expect(document.querySelectorAll('[data-sheet-body]')).toHaveLength(1);
    expect(document.querySelector('footer')?.textContent).toBe('Save');
  });

  it('keeps a subheader outside the scroll body, so it stays in view', () => {
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={vi.fn()} subheader={<p>Key and capo</p>}>
        <p>Body</p>
      </Sheet>,
    );
    const subheader = Array.from(document.querySelectorAll('p')).find(
      (paragraph) => paragraph.textContent === 'Key and capo',
    );
    expect(subheader?.closest('[data-sheet-body]')).toBeNull();
    expect(subheader?.closest('[role=dialog]')).not.toBeNull();
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

  it('focuses its first field on an iPhone without asking the page to scroll it into view', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(IPHONE_PLATFORM);
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_USER_AGENT);
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    try {
      renderSheet(
        root,
        <Sheet title={TITLE} label={TITLE} onClose={vi.fn()}>
          <textarea aria-label="Notes" />
        </Sheet>,
      );
      const textarea = document.querySelector('textarea');
      const fieldFocusOptions = focus.mock.contexts
        .map((context, index) => ({ context, options: focus.mock.calls[index]?.[0] }))
        .filter((call) => call.context === textarea)
        .map((call) => call.options?.preventScroll);
      expect(fieldFocusOptions.length).toBeGreaterThan(0);
      expect(fieldFocusOptions.every((preventScroll) => preventScroll === true)).toBe(true);
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('sizes its shadow to the visual viewport, so the keyboard cannot cover the sheet', () => {
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={vi.fn()}>
        <p>Body</p>
      </Sheet>,
    );
    const scrim = document.querySelector('[data-sheet]')?.parentElement;
    expect(scrim?.style.getPropertyValue('--visual-viewport-height')).not.toBe('');
    expect(scrim?.className).toContain('h-(--visual-viewport-height)');
    expect(scrim?.className).not.toContain('inset-0');
  });

  it('calls onClose from the Close button', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    act(() => document.querySelector<HTMLButtonElement>('[data-sheet-close]')?.click());
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
    const form = document.querySelector('form');
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
    expect(document.querySelector('h2')?.className).toContain('font-display');
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={vi.fn()}>
        <p>Body</p>
      </Sheet>,
    );
    expect(document.querySelector('h2')?.className).toContain('font-sans');
  });

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
    expect(document.querySelector<HTMLElement>('[data-sheet]')?.style.transform).toBe('');
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
    expect(document.querySelector<HTMLElement>('[data-sheet]')?.style.transform).toBe('');
  });

  it('shows no grabber and ignores a swipe on a sheet that cannot be dismissed', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose} isDismissible={false}>
        <p>Body</p>
      </Sheet>,
    );
    expect(document.querySelector('[data-sheet-grabber]')).toBeNull();
    swipeGrabber(100, 400);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('dims the page behind it and closes when that shadow is tapped', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose}>
        <p>Body</p>
      </Sheet>,
    );
    expect(document.querySelector('[data-sheet]')?.parentElement?.className).toContain('bg-scrim');
    tapSheetScrim();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stays open when the shadow of a sheet that cannot be dismissed is tapped', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose} isDismissible={false}>
        <p>Body</p>
      </Sheet>,
    );
    tapSheetScrim();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape, unless closing is disabled while it works', () => {
    const onClose = vi.fn();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose} isDismissible={false} isCloseDisabled>
        <p>Body</p>
      </Sheet>,
    );
    pressEscapeInSheet();
    expect(onClose).not.toHaveBeenCalled();
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={onClose} isDismissible={false}>
        <p>Body</p>
      </Sheet>,
    );
    pressEscapeInSheet();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reads as an alert when it asks to confirm', () => {
    renderSheet(
      root,
      <Sheet title={TITLE} label={TITLE} onClose={vi.fn()} role="alertdialog">
        <p>Body</p>
      </Sheet>,
    );
    expect(document.querySelector('[role=alertdialog]')?.getAttribute('aria-label')).toBe(TITLE);
  });
});
