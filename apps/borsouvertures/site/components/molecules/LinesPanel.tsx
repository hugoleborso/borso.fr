import { useTranslation } from 'react-i18next';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { LoadMoreRow } from '@/components/atoms/LoadMoreRow';
import type { LoadMoreRowProps } from '@/components/atoms/loadMoreRow.types';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { SelectorCard, type SelectorCardProps } from '@/components/atoms/SelectorCard';
import { SelectorPanel } from '@/components/atoms/SelectorPanel';
import type { ComponentByFlag, ComponentByKind } from '@/lib/componentTable.types';
import { usePaginatedList } from '@/lib/usePaginatedList';
import type { LineEntry } from '@/openings/openingFlow.core';
import {
  buildLineSelection,
  clearLinesFromPlayScope,
  isLineActive,
  toggleLineInPlayScope,
} from '@/openings/playScope.core';
import { buildLinePreview } from '@/openings/previews.utils';
import type { Selection } from '@/openings/selectors.utils';
import { setPlayScope, setSelection } from '@/state/appState';
import type { Mode, PlayScope } from '@/state/persistedState.utils';
import type { OpeningPanelProps } from './openingPanel.types';

const ALL_LINES_CARD_BY_MODE: ComponentByKind<Mode, SelectorCardProps> = {
  play: SelectorCard,
  learn: EmptySlot,
};

const LOAD_MORE_BY_AVAILABILITY: ComponentByFlag<LoadMoreRowProps> = {
  true: LoadMoreRow,
  false: EmptySlot,
};

interface LinePickContext {
  scope: PlayScope;
  selection: Selection;
}

const LINE_PICK_BY_MODE: Record<Mode, (entry: LineEntry, context: LinePickContext) => void> = {
  learn: ({ line }, { selection }) => setSelection(buildLineSelection(selection, line.id)),
  play: ({ opening, variation, line }, { scope }) =>
    setPlayScope(toggleLineInPlayScope(scope, opening.id, variation.id, line.id)),
};

export function LinesPanel({ mode, lists, selection, playScope, boardStyle }: OpeningPanelProps) {
  const { t } = useTranslation();
  const { visibleItems, hasMore, loadMore } = usePaginatedList(lists.panelLineEntries);
  const AllLinesCard = ALL_LINES_CARD_BY_MODE[mode];
  const LoadMore = LOAD_MORE_BY_AVAILABILITY[`${hasMore}`];

  return (
    <SelectorPanel title={t('selection.lines.title')}>
      <AllLinesCard
        label={t('selection.lines.all')}
        meta={t('selection.lines.total-count', { total: lists.lineEntries.length })}
        isActive={playScope.lineIds.length === 0}
        onSelect={() => setPlayScope(clearLinesFromPlayScope(playScope))}
      />
      {visibleItems.map((entry) => (
        <SelectorCard
          key={`${entry.variation.id}-${entry.line.id}`}
          label={entry.line.name}
          meta={t('selection.lines.eco', { eco: entry.line.eco })}
          isActive={isLineActive(mode, entry.line.id, selection, playScope)}
          onSelect={() => LINE_PICK_BY_MODE[mode](entry, { scope: playScope, selection })}
          board={
            <MiniBoard
              fen={buildLinePreview(entry.opening, entry.variation, entry.line).fen}
              boardStyleId={boardStyle}
            />
          }
        />
      ))}
      <LoadMore label={t('common.action.load-more')} onLoadMore={loadMore} />
    </SelectorPanel>
  );
}
