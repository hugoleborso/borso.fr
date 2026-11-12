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
