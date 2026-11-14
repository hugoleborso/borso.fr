import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusFieldAboveKeyboard, keepFocusedFieldAboveKeyboard } from './keyboard-reveal.adapter';

function stubVisualViewport(): EventTarget {
  const visualViewport = new EventTarget();
  vi.stubGlobal('visualViewport', visualViewport);
  return visualViewport;
}

describe('focusFieldAboveKeyboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('focuses the field and lifts it to the top once the keyboard has shrunk the view', () => {
    const visualViewport = stubVisualViewport();
    const field = document.createElement('input');
    document.body.append(field);
    const scrollIntoView = vi.fn();
    field.scrollIntoView = scrollIntoView;

    focusFieldAboveKeyboard(field);

    expect(document.activeElement).toBe(field);
    expect(scrollIntoView).not.toHaveBeenCalled();
    visualViewport.dispatchEvent(new Event('resize'));
    visualViewport.dispatchEvent(new Event('resize'));
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start' });
  });

  it('lifts the field again each time it is focused anew', () => {
    const visualViewport = stubVisualViewport();
    const field = document.createElement('input');
    document.body.append(field);
    const scrollIntoView = vi.fn();
    field.scrollIntoView = scrollIntoView;

    focusFieldAboveKeyboard(field);
    field.blur();
    field.focus();
    visualViewport.dispatchEvent(new Event('resize'));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('still focuses the field in a browser with no visual viewport', () => {
    vi.stubGlobal('visualViewport', undefined);
    const field = document.createElement('input');
    document.body.append(field);
    const reportedErrors: unknown[] = [];
    const recordError = (event: ErrorEvent): void => {
      reportedErrors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', recordError);

    focusFieldAboveKeyboard(field);
    window.removeEventListener('error', recordError);

    expect(document.activeElement).toBe(field);
    expect(reportedErrors).toEqual([]);
  });

  it('does nothing when React detaches the field', () => {
    expect(() => focusFieldAboveKeyboard(null)).not.toThrow();
  });
});

function startWith(visualViewport: EventTarget): void {
  keepFocusedFieldAboveKeyboard({
    visualViewport,
    document,
    requestAnimationFrame: (callback) => callback(),
  });
}

describe('keepFocusedFieldAboveKeyboard', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it.each(['input', 'textarea'] as const)(
    'scrolls the focused %s back into view once the keyboard resizes the view',
    (tagName) => {
      const visualViewport = new EventTarget();
      const field = document.createElement(tagName);
      document.body.append(field);
      const scrollIntoView = vi.fn();
      field.scrollIntoView = scrollIntoView;
      startWith(visualViewport);

      field.focus();
      visualViewport.dispatchEvent(new Event('resize'));

      expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'nearest' });
    },
  );

  it('waits for the next frame, after the sheet has taken its new height', () => {
    const visualViewport = new EventTarget();
    const field = document.createElement('textarea');
    document.body.append(field);
    const scrollIntoView = vi.fn();
    field.scrollIntoView = scrollIntoView;
    const frames: (() => void)[] = [];
    keepFocusedFieldAboveKeyboard({
      visualViewport,
      document,
      requestAnimationFrame: (callback) => frames.push(callback),
    });
    field.focus();

    visualViewport.dispatchEvent(new Event('resize'));
    expect(scrollIntoView).not.toHaveBeenCalled();
    for (const frame of frames) frame();

    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  it('scrolls nothing when no text field has focus', () => {
    const visualViewport = new EventTarget();
    const button = document.createElement('button');
    document.body.append(button);
    const scrollIntoView = vi.fn();
    button.scrollIntoView = scrollIntoView;
    startWith(visualViewport);

    button.focus();
    visualViewport.dispatchEvent(new Event('resize'));

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('listens to nothing in a browser with no visual viewport', () => {
    expect(() =>
      keepFocusedFieldAboveKeyboard({
        visualViewport: null,
        document,
        requestAnimationFrame: (callback) => callback(),
      }),
    ).not.toThrow();
  });
});
