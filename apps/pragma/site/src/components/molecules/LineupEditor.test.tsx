/**
 * UI test for LineupEditor — covers the modal-open behaviour
 * (`<dialog>.open`), the supplied prefilled values, the save payload
 * (all-null selection collapses to `null`), the Save callback shape,
 * the Reset-to-default callback, and the Cancel close.
 */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n';
import {
  LineupEditor,
  type LineupEditorInstrument,
  type LineupEditorMember,
  type LineupRecord,
} from './LineupEditor';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const HUGO: LineupEditorMember = { id: 'hugo-id', name: 'Hugo', color: '#d96f5a' };
const PAULINE: LineupEditorMember = { id: 'pauline-id', name: 'Pauline', color: '#7a8f5a' };
const GUITAR: LineupEditorInstrument = { id: 'guitar-id', name: 'Guitar' };
const BASS: LineupEditorInstrument = { id: 'bass-id', name: 'Bass' };
const DRUMS: LineupEditorInstrument = { id: 'drums-id', name: 'Drums' };

const SAVE_BUTTON_TEXT_EN = 'Save';
const RESET_BUTTON_TEXT_EN = 'Reset to song default';
const CANCEL_BUTTON_TEXT_EN = 'Cancel';

// JSDOM doesn't implement <dialog>.showModal/close; stub the
// prototype once so the production showModal() call doesn't throw.
function stubDialogModal(): void {
  function stubShowModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  }
  function stubClose(this: HTMLDialogElement): void {
    this.removeAttribute('open');
  }
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: stubShowModal,
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: stubClose,
  });
}

function renderEditor(root: Root, node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function findButtonByText(container: HTMLElement, label: string): HTMLButtonElement | null {
  const buttons = Array.from(container.querySelectorAll('button'));
  return buttons.find((button) => button.textContent?.trim() === label) ?? null;
}

function findInstrumentSelectFor(container: HTMLElement, memberId: string): HTMLSelectElement {
  const select = container.querySelector(`#lineup-editor-instrument-${memberId}`);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`no select found for member ${memberId}`);
  }
  return select;
}

describe('LineupEditor', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    stubDialogModal();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders nothing when open=false', () => {
    renderEditor(
      root,
      <LineupEditor
        open={false}
        surface="song"
        members={[HUGO, PAULINE]}
        instruments={[GUITAR, BASS, DRUMS]}
        currentLineup={{}}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container.querySelector('dialog')).toBeNull();
  });

  it('opens a native <dialog> with the modal flag when open=true', () => {
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO]}
        instruments={[GUITAR]}
        currentLineup={{}}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = container.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
  });

  it('prefills each select with the supplied lineup value', () => {
    const currentLineup: LineupRecord = { [HUGO.id]: GUITAR.id, [PAULINE.id]: BASS.id };
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO, PAULINE]}
        instruments={[GUITAR, BASS, DRUMS]}
        currentLineup={currentLineup}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(findInstrumentSelectFor(container, HUGO.id).value).toBe(GUITAR.id);
    expect(findInstrumentSelectFor(container, PAULINE.id).value).toBe(BASS.id);
  });

  it('exposes the "not playing" option plus every instrument and the null fallback', () => {
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO]}
        instruments={[GUITAR, BASS, DRUMS]}
        currentLineup={{}}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const select = findInstrumentSelectFor(container, HUGO.id);
    const optionValues = Array.from(select.options).map((option) => option.value);
    expect(optionValues).toEqual(['', GUITAR.id, BASS.id, DRUMS.id]);
  });

  it('passes the edited lineup to onSave and closes the modal', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO, PAULINE]}
        instruments={[GUITAR, BASS]}
        currentLineup={{}}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    const hugoSelect = findInstrumentSelectFor(container, HUGO.id);
    await act(async () => {
      hugoSelect.value = GUITAR.id;
      hugoSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      const form = container.querySelector('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSave).toHaveBeenCalledWith({ [HUGO.id]: GUITAR.id });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('collapses an all-not-playing selection to null on save (no empty record)', async () => {
    const onSave = vi.fn();
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO, PAULINE]}
        instruments={[GUITAR]}
        currentLineup={{ [HUGO.id]: GUITAR.id }}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    const hugoSelect = findInstrumentSelectFor(container, HUGO.id);
    await act(async () => {
      hugoSelect.value = '';
      hugoSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      const form = container.querySelector('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('shows the Reset button on the setlist-entry surface and calls onReset + onClose when clicked', () => {
    const onReset = vi.fn();
    const onClose = vi.fn();
    renderEditor(
      root,
      <LineupEditor
        open
        surface="setlist-entry"
        members={[HUGO]}
        instruments={[GUITAR]}
        currentLineup={{ [HUGO.id]: GUITAR.id }}
        onSave={vi.fn()}
        onReset={onReset}
        onClose={onClose}
      />,
    );
    const resetButton = findButtonByText(container, RESET_BUTTON_TEXT_EN);
    expect(resetButton).not.toBeNull();
    act(() => resetButton?.click());
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the Reset button on the song surface', () => {
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO]}
        instruments={[GUITAR]}
        currentLineup={{}}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(findButtonByText(container, RESET_BUTTON_TEXT_EN)).toBeNull();
  });

  it('closes without saving when Cancel is clicked', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO]}
        instruments={[GUITAR]}
        currentLineup={{}}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    const cancelButton = findButtonByText(container, CANCEL_BUTTON_TEXT_EN);
    act(() => cancelButton?.click());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles a Save click without invoking onReset even when supplied', async () => {
    const onSave = vi.fn();
    const onReset = vi.fn();
    renderEditor(
      root,
      <LineupEditor
        open
        surface="setlist-entry"
        members={[HUGO]}
        instruments={[GUITAR]}
        currentLineup={{ [HUGO.id]: GUITAR.id }}
        onSave={onSave}
        onReset={onReset}
        onClose={vi.fn()}
      />,
    );
    const saveButton = findButtonByText(container, SAVE_BUTTON_TEXT_EN);
    await act(async () => {
      saveButton?.click();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onReset).not.toHaveBeenCalled();
  });
});
