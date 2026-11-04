import { act, fireEvent } from '@testing-library/react';

function readOpenSheet(): HTMLElement {
  const sheet = document.querySelector<HTMLElement>('[data-sheet]');
  if (sheet === null) throw new Error('No sheet is open');
  return sheet;
}

// @FollowsBlueprint test-component-render
export function pressEscapeInSheet(): void {
  const sheet = readOpenSheet();
  act(() => {
    fireEvent.keyDown(sheet, { key: 'Escape' });
  });
}

// @FollowsBlueprint test-component-render
export function tapSheetScrim(): void {
  const scrim = readOpenSheet().parentElement;
  if (scrim === null) throw new Error('The sheet has no scrim around it');
  const touch = { pointerId: 1, pointerType: 'touch', button: 0 } as const;
  act(() => {
    fireEvent.pointerDown(scrim, touch);
    fireEvent.pointerUp(scrim, touch);
    fireEvent.click(scrim);
  });
}
