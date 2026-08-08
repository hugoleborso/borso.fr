/**
 * Generic debounce primitive. Returns a wrapped function that delays
 * the underlying call until `delayMs` has elapsed since the last
 * invocation; calling the returned `.cancel()` voids any pending
 * call. No reliance on React — usable from any layer.
 */

export interface DebouncedFunction<Args extends readonly unknown[]> {
  (...args: Args): void;
  cancel: () => void;
}

export function debounce<Args extends readonly unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): DebouncedFunction<Args> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: Args): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      callback(...args);
    }, delayMs);
  };

  debounced.cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
