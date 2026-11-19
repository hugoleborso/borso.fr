class JsdomAnimationEvent extends Event {
  constructor(type, init = {}) {
    super(type, init);
    this.animationName = init.animationName ?? '';
    this.elapsedTime = init.elapsedTime ?? 0;
    this.pseudoElement = init.pseudoElement ?? '';
  }
}

if (typeof globalThis.AnimationEvent === 'undefined') {
  globalThis.AnimationEvent = JsdomAnimationEvent;
}

class StillResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = StillResizeObserver;
}

function closeDialog() {
  this.removeAttribute('open');
}

if (typeof globalThis.HTMLDialogElement?.prototype.close === 'undefined') {
  Object.defineProperty(globalThis.HTMLDialogElement.prototype, 'close', {
    configurable: true,
    writable: true,
    value: closeDialog,
  });
}
