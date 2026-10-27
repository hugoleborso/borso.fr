import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemberMark } from './MemberMark';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const CORAL = '#e87b62';
const PLUM = '#8a4f7a';

// @FollowsBlueprint test-component-render
describe('MemberMark', () => {
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

  function renderMark(node: React.ReactNode): HTMLElement | null {
    act(() => root.render(node));
    return container.querySelector('span');
  }

  it('fills a cell with the stored member colour and inks it with the readable ink', () => {
    const coral = renderMark(<MemberMark color={CORAL} shape="cell" />);
    expect(coral?.style.backgroundColor).toBe('rgb(232, 123, 98)');
    expect(coral?.className).toContain('text-on-color-dark');
    const plum = renderMark(<MemberMark color={PLUM} shape="cell" />);
    expect(plum?.className).toContain('text-on-color-light');
  });

  it('draws a ring with the colour as its border and a lane with the colour tinted into the paper', () => {
    expect(renderMark(<MemberMark color={CORAL} shape="ring" />)?.style.borderColor).toBe(
      'rgb(232, 123, 98)',
    );
    expect(renderMark(<MemberMark color={CORAL} shape="lane" />)?.getAttribute('style')).toContain(
      `color-mix(in srgb, ${CORAL} 18%, var(--color-paper))`,
    );
  });

  it('fills a dot with the colour', () => {
    expect(renderMark(<MemberMark color={PLUM} shape="dot" />)?.style.backgroundColor).toBe(
      'rgb(138, 79, 122)',
    );
  });
});
