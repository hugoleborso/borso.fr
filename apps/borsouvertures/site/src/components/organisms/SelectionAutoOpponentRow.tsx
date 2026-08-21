import { AutoOpponentToggle } from '@/components/molecules/AutoOpponentToggle';
import { setPlayAutoOpponent } from '@/state/appState';

interface SelectionAutoOpponentRowProps {
  isAutoOpponentEnabled: boolean;
}

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
