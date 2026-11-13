import { useTranslation } from 'react-i18next';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { formatMoveNotation } from '@/decks/card.core';
import { type ExplorerCandidate, selectShownNames } from '@/explorer/explorer.core';
import type { Side } from '@/state/persistedState.utils';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

interface ExplorerCandidateRowProps {
  candidate: ExplorerCandidate;
  plyIndex: number;
  side: Side;
  boardStyle: BoardThemeId;
  onPlay: (moveUci: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function ExplorerCandidateRow({
  candidate,
  plyIndex,
  side,
  boardStyle,
  onPlay,
}: ExplorerCandidateRowProps) {
  const { t } = useTranslation();
  const names = selectShownNames(candidate);
  const more = names.hasHiddenNames ? ` ${t('explore.more', { count: names.hiddenCount })}` : '';
  return (
    <button
      type="button"
      className="flex items-center gap-3 w-full min-h-16 py-1.5 border-b border-rule text-left hover:bg-surface"
      onClick={() => onPlay(candidate.moveUci)}
    >
      <MiniBoard fen={candidate.fenAfter} boardStyleId={boardStyle} orientation={side} />
      <span className="flex flex-col flex-auto min-w-0">
        <span className="font-mono font-bold">
          {formatMoveNotation(plyIndex, candidate.moveSan)}
        </span>
        <span className="text-sm leading-snug line-clamp-2">
          {names.shown.join(' · ')}
          <span className="text-ink-muted">{more}</span>
        </span>
      </span>
      <span className="shrink-0 text-sm text-ink-muted tabular-nums">
        {t('explore.line-count', { count: candidate.lineCount })}
      </span>
    </button>
  );
}
