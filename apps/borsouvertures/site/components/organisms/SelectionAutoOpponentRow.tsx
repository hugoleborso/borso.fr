import { AutoOpponentToggle } from '@/components/molecules/AutoOpponentToggle';
import { setPlayAutoOpponent } from '@/state/appState';

const ROW_STYLE = { marginTop: '0.5rem' } as const;

interface SelectionAutoOpponentRowProps {
  isAutoOpponentEnabled: boolean;
}

/** Only play mode has an opponent to automate, so learn mode renders nothing. */
export function SelectionAutoOpponentRow({ isAutoOpponentEnabled }: SelectionAutoOpponentRowProps) {
  return (
    <div className="controls-row" style={ROW_STYLE}>
      <AutoOpponentToggle
        isAutoOpponentEnabled={isAutoOpponentEnabled}
        onToggle={setPlayAutoOpponent}
      />
    </div>
  );
}
