import { useTranslation } from 'react-i18next';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { LoadMoreRow } from '@/components/atoms/LoadMoreRow';
import type { LoadMoreRowProps } from '@/components/atoms/loadMoreRow.types';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { SelectorCard, type SelectorCardProps } from '@/components/atoms/SelectorCard';
import { SelectorPanel } from '@/components/atoms/SelectorPanel';
import type { ComponentByFlag, ComponentByKind } from '@/lib/componentTable.types';
import { usePaginatedList } from '@/lib/paginated-list.hook';
import type { VariationEntry } from '@/openings/openingFlow.core';
import {
  buildVariationSelection,
  clearVariationsFromPlayScope,
  isVariationActive,
  toggleVariationInPlayScope,
} from '@/openings/playScope.core';
import { buildVariationPreview } from '@/openings/previews.utils';
import { setPlayScope, setSelection } from '@/state/appState';
import type { Mode, PlayScope } from '@/state/persistedState.utils';
import type { OpeningPanelProps } from './openingPanel.types';

// @FollowsBlueprint component-lookup-table
const ALL_VARIATIONS_CARD_BY_MODE: ComponentByKind<Mode, SelectorCardProps> = {
  play: SelectorCard,
  learn: EmptySlot,
};

const LOAD_MORE_BY_AVAILABILITY: ComponentByFlag<LoadMoreRowProps> = {
  true: LoadMoreRow,
  false: EmptySlot,
};

const VARIATION_PICK_BY_MODE: Record<Mode, (entry: VariationEntry, scope: PlayScope) => void> = {
  learn: ({ opening, variation }) =>
    setSelection(buildVariationSelection(opening.id, variation.id)),
  play: ({ opening, variation }, scope) =>
    setPlayScope(toggleVariationInPlayScope(scope, opening.id, variation.id)),
};

// @FollowsBlueprint molecule-presentational
export function VariationsPanel({
  mode,
  lists,
  selection,
  playScope,
  boardStyle,
  onAdvance,
}: OpeningPanelProps) {
  const { t } = useTranslation();
  const { visibleItems, hasMore, loadMore } = usePaginatedList(lists.panelVariationEntries);
  const AllVariationsCard = ALL_VARIATIONS_CARD_BY_MODE[mode];
  const LoadMore = LOAD_MORE_BY_AVAILABILITY[`${hasMore}`];

  function pickVariation(entry: VariationEntry): void {
    VARIATION_PICK_BY_MODE[mode](entry, playScope);
    onAdvance();
  }

  function selectAllVariations(): void {
    setPlayScope(clearVariationsFromPlayScope(playScope));
    onAdvance();
  }

  return (
    <SelectorPanel title={t('selection.variations.title')}>
      <AllVariationsCard
        label={t('selection.variations.all')}
        meta={t('selection.variations.total-count', { total: lists.variationEntries.length })}
        isActive={playScope.variationIds.length === 0}
        onSelect={selectAllVariations}
      />
      {visibleItems.map((entry) => (
        <SelectorCard
          key={`${entry.opening.id}-${entry.variation.id}`}
          label={entry.variation.name}
          meta={t('selection.variations.line-count', { count: entry.variation.lines.length })}
          isActive={isVariationActive({
            mode,
            variationId: entry.variation.id,
            selection,
            scope: playScope,
          })}
          onSelect={() => pickVariation(entry)}
          board={
            <MiniBoard
              fen={buildVariationPreview(entry.opening, entry.variation).fen}
              boardStyleId={boardStyle}
            />
          }
        />
      ))}
      <LoadMore label={t('common.action.load-more')} onLoadMore={loadMore} />
    </SelectorPanel>
  );
}
