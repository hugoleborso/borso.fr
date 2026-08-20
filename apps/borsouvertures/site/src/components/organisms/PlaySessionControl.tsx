import { AutoOpponentToggle } from '@/components/molecules/AutoOpponentToggle';
import { playMachine } from '@/openings/machineInstances';
import { setPlayAutoOpponent } from '@/state/appState';
import type { SessionModeControlProps } from './session.types';

function changeAutoOpponent(isAutoOpponentEnabled: boolean): void {
  setPlayAutoOpponent(isAutoOpponentEnabled);
  playMachine.setAutoOpponent(isAutoOpponentEnabled);
}

// @FollowsBlueprint organism-presentational
export function PlaySessionControl({ isAutoOpponentEnabled }: SessionModeControlProps) {
  return (
    <AutoOpponentToggle
      isAutoOpponentEnabled={isAutoOpponentEnabled}
      onToggle={changeAutoOpponent}
    />
  );
}
