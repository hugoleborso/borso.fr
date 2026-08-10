/**
 * The impure edge that the two opening machines inject.
 *
 * Both machines take `pickRandom` and `scheduleTimeout` as options so a test
 * can drive them deterministically. The production implementations read the
 * random number generator and the event loop, so they cannot live in a
 * `.utils.ts` file, which is gated as pure.
 *
 * See docs/standards/02-purity-and-core-files.md.
 */
export function pickRandomCandidate(candidates: readonly string[]): string | undefined {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function scheduleTimeoutCallback(callback: () => void, delayMilliseconds: number): void {
  setTimeout(callback, delayMilliseconds);
}
