function openDialog(this: HTMLDialogElement): void {
  this.setAttribute('open', '');
}

function closeDialog(this: HTMLDialogElement): void {
  this.removeAttribute('open');
  this.dispatchEvent(new Event('close'));
}

// @FollowsBlueprint test-jsdom-gap-stub
export function stubSheetDialog(): void {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: openDialog,
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: closeDialog,
  });
}
