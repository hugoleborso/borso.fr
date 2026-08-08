import { AutoOpponentToggle } from '@/components/molecules/AutoOpponentToggle';
import { playMachine } from '@/openings/machineInstances';
import { setPlayAutoOpponent } from '@/state/appState';
import type { SessionModeControlProps } from './session.types';

/**
 * Toggling the automated opponent mid-game must not restart the game, so the
 * running machine is told about the change here, in the handler for the click
 * that made it, rather than by an effect watching the stored preference.
 */
function changeAutoOpponent(isAutoOpponentEnabled: boolean): void {
  setPlayAutoOpponent(isAutoOpponentEnabled);
  playMachine.setAutoOpponent(isAutoOpponentEnabled);
}

export function PlaySessionControl({ isAutoOpponentEnabled }: SessionModeControlProps) {
  return (
    <AutoOpponentToggle
      isAutoOpponentEnabled={isAutoOpponentEnabled}
      onToggle={changeAutoOpponent}
    />
  );
}
