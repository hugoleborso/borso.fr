export interface DebouncedFunction<Args extends readonly unknown[]> {
  (...args: Args): void;
  cancel: () => void;
}

// @FollowsBlueprint utils-pure-module
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
