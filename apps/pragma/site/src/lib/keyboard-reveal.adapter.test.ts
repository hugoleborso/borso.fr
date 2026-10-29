import { afterEach, describe, expect, it, vi } from 'vitest';
import { focusFieldAboveKeyboard } from './keyboard-reveal.adapter';

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
