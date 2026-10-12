import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemberChip } from './MemberChip';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const GREEN_FAR_FROM_EVERY_PALETTE_SWATCH = '#22c55e';
const RENDERED_GREEN = 'rgb(34, 197, 94)';

// @FollowsBlueprint test-component-render
describe('MemberChip', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('paints the avatar in the colour the member picked, not a nearby palette swatch', () => {
    act(() => {
      root.render(
        <MemberChip memberName="Gui" memberColor={GREEN_FAR_FROM_EVERY_PALETTE_SWATCH} />,
      );
    });
    const avatar = container.querySelector<HTMLElement>('span > span');
    expect(avatar?.style.backgroundColor).toBe(RENDERED_GREEN);
    expect(avatar?.textContent).toBe('G');
  });
});
