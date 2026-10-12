import { useRef, useState } from 'react';

export interface DebouncedValue<Value> {
  readonly value: Value;
  readonly settledValue: Value;
  readonly onValueChanged: (value: Value) => void;
}

// @FollowsBlueprint hook-timer-owned-by-handlers
export function useDebouncedValue<Value>(
  initialValue: Value,
  delayMs: number,
): DebouncedValue<Value> {
  const [value, setValue] = useState(initialValue);
  const [settledValue, setSettledValue] = useState(initialValue);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return {
    value,
    settledValue,
    onValueChanged: (nextValue) => {
      setValue(nextValue);
      if (pendingTimer.current !== null) clearTimeout(pendingTimer.current);
      pendingTimer.current = setTimeout(() => {
        pendingTimer.current = null;
        setSettledValue(nextValue);
      }, delayMs);
    },
  };
}
