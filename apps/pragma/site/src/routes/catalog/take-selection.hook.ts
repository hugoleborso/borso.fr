/** @Feature takes */

import { useSearchParams } from 'react-router-dom';

const TAKE_PARAMETER = 'take';

export interface TakeSelection {
  readonly selectedTakeId: string | null;
  readonly selectTake: (takeId: string | null) => void;
}

export function useTakeSelection(): TakeSelection {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectTake = (takeId: string | null): void => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(TAKE_PARAMETER);
        if (takeId !== null) next.set(TAKE_PARAMETER, takeId);
        return next;
      },
      { replace: true },
    );
  };
  return { selectedTakeId: searchParams.get(TAKE_PARAMETER), selectTake };
}
