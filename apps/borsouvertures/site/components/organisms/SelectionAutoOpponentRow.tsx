import { AutoOpponentToggle } from '@/components/molecules/AutoOpponentToggle';
import { setPlayAutoOpponent } from '@/state/appState';

interface SelectionAutoOpponentRowProps {
  isAutoOpponentEnabled: boolean;
}

/** Only play mode has an opponent to automate, so learn mode renders nothing. */
// @FollowsBlueprint organism-presentational
export function SelectionAutoOpponentRow({ isAutoOpponentEnabled }: SelectionAutoOpponentRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      <AutoOpponentToggle
        isAutoOpponentEnabled={isAutoOpponentEnabled}
        onToggle={setPlayAutoOpponent}
      />
    </div>
  );
}
