/**
 * UI test for LineupEditor — covers the modal-open behaviour
 * (`<dialog>.open`), the instruments each member is shown holding, the save
 * payload (a selection where nobody plays collapses to `null`), the Save
 * callback shape, the Reset-to-default callback, and the Cancel close.
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

const RESET_BUTTON_TEXT_EN = 'Reset to song default';
const CANCEL_BUTTON_TEXT_EN = 'Cancel';

// JSDOM doesn't implement <dialog>.showModal/close; stub the
// prototype once so the production showModal() call doesn't throw.
// @FollowsBlueprint test-jsdom-gap-stub
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
  return buttons.find((button) => button.textContent.trim() === label) ?? null;
}

function findInstrumentToggles(container: HTMLElement, memberName: string): HTMLButtonElement[] {
  const group = container.querySelector(`[aria-label="${memberName} — Instruments"]`);
  if (!(group instanceof HTMLElement)) {
    throw new TypeError(`no instrument group found for ${memberName}`);
  }
  return Array.from(group.querySelectorAll('button'));
}

function findInstrumentToggle(
  container: HTMLElement,
  memberName: string,
  instrumentName: string,
): HTMLButtonElement {
  const toggle = findInstrumentToggles(container, memberName).find(
    (button) => button.textContent.trim() === instrumentName,
  );
  if (toggle === undefined) {
    throw new TypeError(`no ${instrumentName} toggle found for ${memberName}`);
  }
  return toggle;
}

function heldInstrumentNames(container: HTMLElement, memberName: string): string[] {
  return findInstrumentToggles(container, memberName)
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent.trim());
}

// @FollowsBlueprint test-component-render
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

  it('shows each member holding what the supplied lineup gives them', () => {
    const currentLineup: LineupRecord = { [HUGO.id]: [GUITAR.id], [PAULINE.id]: [BASS.id] };
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
    expect(heldInstrumentNames(container, HUGO.name)).toEqual([GUITAR.name]);
    expect(heldInstrumentNames(container, PAULINE.name)).toEqual([BASS.name]);
  });

  it('shows a member holding two instruments at once', () => {
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO]}
        instruments={[GUITAR, BASS, DRUMS]}
        currentLineup={{ [HUGO.id]: [DRUMS.id, GUITAR.id] }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(heldInstrumentNames(container, HUGO.name)).toEqual([GUITAR.name, DRUMS.name]);
  });

  it('offers every instrument as a toggle, none of them held to begin with', () => {
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
    const toggleNames = findInstrumentToggles(container, HUGO.name).map((button) =>
      button.textContent.trim(),
    );
    expect(toggleNames).toEqual([GUITAR.name, BASS.name, DRUMS.name]);
    expect(heldInstrumentNames(container, HUGO.name)).toEqual([]);
  });

  it('passes the edited lineup to onSave (wasReset=false) and closes the modal', async () => {
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
    await act(async () => {
      findInstrumentToggle(container, HUGO.name, GUITAR.name).click();
    });
    await act(async () => {
      const form = container.querySelector('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSave).toHaveBeenCalledWith({ [HUGO.id]: [GUITAR.id], [PAULINE.id]: [] }, false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('collapses a selection where nobody plays to null on save', async () => {
    const onSave = vi.fn();
    renderEditor(
      root,
      <LineupEditor
        open
        surface="song"
        members={[HUGO, PAULINE]}
        instruments={[GUITAR]}
        currentLineup={{ [HUGO.id]: [GUITAR.id] }}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );
    await act(async () => {
      findInstrumentToggle(container, HUGO.name, GUITAR.name).click();
    });
    await act(async () => {
      const form = container.querySelector('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSave).toHaveBeenCalledWith(null, false);
  });

  it('reverts the form to defaultLineup on Reset, keeps the dialog open, then on Save fires onSave(default, true)', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderEditor(
      root,
      <LineupEditor
        open
        surface="setlist-entry"
        members={[HUGO]}
        instruments={[GUITAR, BASS]}
        currentLineup={{ [HUGO.id]: [BASS.id] }}
        defaultLineup={{ [HUGO.id]: [GUITAR.id] }}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    expect(heldInstrumentNames(container, HUGO.name)).toEqual([BASS.name]);
    const resetButton = findButtonByText(container, RESET_BUTTON_TEXT_EN);
    expect(resetButton).not.toBeNull();
    await act(async () => {
      resetButton?.click();
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(heldInstrumentNames(container, HUGO.name)).toEqual([GUITAR.name]);
    expect(container.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    await act(async () => {
      const form = container.querySelector('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSave).toHaveBeenCalledWith({ [HUGO.id]: [GUITAR.id] }, true);
  });

  it('omits the Reset button when defaultLineup is not supplied (song surface)', () => {
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
});
