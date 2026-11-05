import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AutoGrowTextarea } from './AutoGrowTextarea';

const BORDER_HEIGHT_PX = 2;
const FALLBACK_FONT_TEXT_HEIGHT_PX = 168;
const WEB_FONT_TEXT_HEIGHT_PX = 120;
const TYPED_TEXT_HEIGHT_PX = 216;
const ANY_CLIENT_HEIGHT_PX = 70;
const NOTE = 'Couper la batterie net avant le pont.\nHugo reprend seul.';

const layout = { textHeightPx: FALLBACK_FONT_TEXT_HEIGHT_PX };
const DO_NOTHING = (): void => undefined;

function defineGetter(name: 'scrollHeight' | 'clientHeight' | 'offsetHeight', read: () => number) {
  Object.defineProperty(HTMLTextAreaElement.prototype, name, { configurable: true, get: read });
}

function holdFontsLoading(): () => Promise<void> {
  const loading = { finish: DO_NOTHING };
  const ready = new Promise<void>((resolve) => {
    loading.finish = resolve;
  });
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
  return async () => {
    loading.finish();
    await act(async () => {
      await ready;
    });
  };
}

// @FollowsBlueprint test-component-render
describe('a textarea that grows to fit its text', () => {
  beforeEach(() => {
    layout.textHeightPx = FALLBACK_FONT_TEXT_HEIGHT_PX;
    defineGetter('scrollHeight', () => layout.textHeightPx);
    defineGetter('clientHeight', () => ANY_CLIENT_HEIGHT_PX);
    defineGetter('offsetHeight', () => ANY_CLIENT_HEIGHT_PX + BORDER_HEIGHT_PX);
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'scrollHeight');
    Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'clientHeight');
    Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'offsetHeight');
    Reflect.deleteProperty(document, 'fonts');
  });

  it('fits a saved note again once the web font that wraps it finishes loading', async () => {
    const finishLoadingFonts = holdFontsLoading();
    render(<AutoGrowTextarea aria-label="Notes" defaultValue={NOTE} />);
    const notes = screen.getByRole('textbox', { name: 'Notes' });
    expect(notes.style.height).toBe(`${String(FALLBACK_FONT_TEXT_HEIGHT_PX + BORDER_HEIGHT_PX)}px`);

    layout.textHeightPx = WEB_FONT_TEXT_HEIGHT_PX;
    await finishLoadingFonts();

    expect(notes.style.height).toBe(`${String(WEB_FONT_TEXT_HEIGHT_PX + BORDER_HEIGHT_PX)}px`);
  });

  it('grows with what the member types', () => {
    render(<AutoGrowTextarea aria-label="Notes" defaultValue={NOTE} />);
    const notes = screen.getByRole('textbox', { name: 'Notes' });

    layout.textHeightPx = TYPED_TEXT_HEIGHT_PX;
    fireEvent.change(notes, { target: { value: `${NOTE}\nTempo 92.` } });

    expect(notes.style.height).toBe(`${String(TYPED_TEXT_HEIGHT_PX + BORDER_HEIGHT_PX)}px`);
  });
});
