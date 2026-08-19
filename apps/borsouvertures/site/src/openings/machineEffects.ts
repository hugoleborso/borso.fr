/**
 * The impure edge that the two opening machines inject.
 *
 * Both machines take `pickRandom` and `scheduleTimeout` as options so a test
 * can drive them deterministically. The production implementations read the
 * random number generator and the event loop, so they cannot live in a
 * `.utils.ts` file, which is gated as pure.
 *
 * See docs/standards/02-purity-and-core-files.md.
 *
 * @Blueprint machine-impure-edge
 * @BlueprintName Isolated Impure Edge Module
 * @BlueprintUsage Use for the randomness, timers or clock a mostly pure module needs, so the rest of it stays coverable.
 * @BlueprintDescription Collects the calls that cannot be deterministic, here `Math.random` and `setTimeout`, into one module with no `.utils.ts` or `.core.ts` suffix, so the full coverage gate that applies to pure files does not apply to it. The machines take these as optional options and fall back to these functions, so production wires the real event loop and a test injects a captured timer queue and a seeded picker. Leaving them inside the machine would make every timing test depend on a real clock.
 */
export function pickRandomCandidate(candidates: readonly string[]): string | undefined {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function scheduleTimeoutCallback(callback: () => void, delayMilliseconds: number): void {
  setTimeout(callback, delayMilliseconds);
}
