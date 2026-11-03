import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
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
const OVERRIDE_BADGE_TEXT_EN = 'Override';
const SAVE_AS_DEFAULT_BUTTON_TEXT_EN = 'Save as song default';

function renderEditor(root: Root, node: ReactNode): void {
  act(() => {
    root.render(node);
  });
}

function findOverrideBadge(): HTMLElement | null {
  const spans = Array.from(document.querySelectorAll('span'));
  return spans.find((span) => span.textContent.trim() === OVERRIDE_BADGE_TEXT_EN) ?? null;
}

function findButtonByText(label: string): HTMLButtonElement | null {
  const buttons = Array.from(document.querySelectorAll('button'));
  return buttons.find((button) => button.textContent.trim() === label) ?? null;
}

function listInstrumentToggles(memberName: string): HTMLButtonElement[] {
  const group = document.querySelector(`[aria-label="${memberName} — Instruments"]`);
  if (!(group instanceof HTMLElement)) {
    throw new TypeError(`no instrument group found for ${memberName}`);
  }
  return Array.from(group.querySelectorAll('button'));
}

function getInstrumentToggle(memberName: string, instrumentName: string): HTMLButtonElement {
  const toggle = listInstrumentToggles(memberName).find(
    (button) => button.textContent.trim() === instrumentName,
  );
  if (toggle === undefined) {
    throw new TypeError(`no ${instrumentName} toggle found for ${memberName}`);
  }
  return toggle;
}

function heldInstrumentNames(memberName: string): string[] {
  return listInstrumentToggles(memberName)
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent.trim());
}

// @FollowsBlueprint test-component-render
describe('LineupEditor', () => {
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
    expect(document.querySelector('[role=dialog]')).toBeNull();
  });

  it('opens a modal dialog when open=true', () => {
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
    expect(document.querySelector('[role=dialog]')?.closest('[data-sheet]')).not.toBeNull();
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
    expect(heldInstrumentNames(HUGO.name)).toEqual([GUITAR.name]);
    expect(heldInstrumentNames(PAULINE.name)).toEqual([BASS.name]);
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
    expect(heldInstrumentNames(HUGO.name)).toEqual([GUITAR.name, DRUMS.name]);
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
    const toggleNames = listInstrumentToggles(HUGO.name).map((button) => button.textContent.trim());
    expect(toggleNames).toEqual([GUITAR.name, BASS.name, DRUMS.name]);
    expect(heldInstrumentNames(HUGO.name)).toEqual([]);
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
      getInstrumentToggle(HUGO.name, GUITAR.name).click();
    });
    await act(async () => {
      const form = document.querySelector('form');
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
      getInstrumentToggle(HUGO.name, GUITAR.name).click();
    });
    await act(async () => {
      const form = document.querySelector('form');
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
    expect(heldInstrumentNames(HUGO.name)).toEqual([BASS.name]);
    const resetButton = findButtonByText(RESET_BUTTON_TEXT_EN);
    expect(resetButton).not.toBeNull();
    await act(async () => {
      resetButton?.click();
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(heldInstrumentNames(HUGO.name)).toEqual([GUITAR.name]);
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    await act(async () => {
      const form = document.querySelector('form');
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(onSave).toHaveBeenCalledWith({ [HUGO.id]: [GUITAR.id] }, true);
  });

  it('hands the edited lineup to onSaveAsSongDefault, not onSave, and closes', async () => {
    const onSave = vi.fn();
    const onSaveAsSongDefault = vi.fn();
    const onClose = vi.fn();
    renderEditor(
      root,
      <LineupEditor
        open
        surface="setlist-entry"
        members={[HUGO, PAULINE]}
        instruments={[GUITAR, BASS]}
        currentLineup={{}}
        defaultLineup={{}}
        onSave={onSave}
        onSaveAsSongDefault={onSaveAsSongDefault}
        onClose={onClose}
      />,
    );
    await act(async () => {
      getInstrumentToggle(PAULINE.name, BASS.name).click();
    });
    await act(async () => {
      findButtonByText(SAVE_AS_DEFAULT_BUTTON_TEXT_EN)?.click();
    });
    expect(onSaveAsSongDefault).toHaveBeenCalledWith({ [HUGO.id]: [], [PAULINE.id]: [BASS.id] });
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits Save as song default when no handler is supplied', () => {
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
    expect(findButtonByText(SAVE_AS_DEFAULT_BUTTON_TEXT_EN)).toBeNull();
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
    expect(findButtonByText(RESET_BUTTON_TEXT_EN)).toBeNull();
  });

  it('marks the entry as overriding the song default, so the tint is not the only signal', () => {
    renderEditor(
      root,
      <LineupEditor
        open
        surface="setlist-entry"
        members={[HUGO]}
        instruments={[GUITAR, BASS]}
        currentLineup={{ [HUGO.id]: [BASS.id] }}
        defaultLineup={{ [HUGO.id]: [GUITAR.id] }}
        overridesSongDefault
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const badge = findOverrideBadge();
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-highlight');
  });

  it('carries no override marker when the entry plays the song default', () => {
    renderEditor(
      root,
      <LineupEditor
        open
        surface="setlist-entry"
        members={[HUGO]}
        instruments={[GUITAR, BASS]}
        currentLineup={{ [HUGO.id]: [GUITAR.id] }}
        defaultLineup={{ [HUGO.id]: [GUITAR.id] }}
        overridesSongDefault={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(findOverrideBadge()).toBeNull();
  });

  it('closes without saving when the sheet is closed', () => {
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
    const closeButton = document.querySelector<HTMLButtonElement>('[data-sheet-close]');
    act(() => closeButton?.click());
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
