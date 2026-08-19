import { useTranslation } from 'react-i18next';
import { EmptySlot } from '@/components/atoms/EmptySlot';
import { LoadMoreRow } from '@/components/atoms/LoadMoreRow';
import type { LoadMoreRowProps } from '@/components/atoms/loadMoreRow.types';
import { MiniBoard } from '@/components/atoms/MiniBoard';
import { SelectorCard, type SelectorCardProps } from '@/components/atoms/SelectorCard';
import { SelectorPanel } from '@/components/atoms/SelectorPanel';
import type { ComponentByFlag, ComponentByKind } from '@/lib/componentTable.types';
import { usePaginatedList } from '@/lib/paginated-list.hook';
import {
  buildOpeningSelection,
  clearOpeningsFromPlayScope,
  isOpeningActive,
  toggleOpeningInPlayScope,
} from '@/openings/playScope.core';
import { buildOpeningPreview } from '@/openings/previews.utils';
import type { Opening } from '@/openings/types';
import { setPlayScope, setSelection } from '@/state/appState';
import type { Mode, PlayScope } from '@/state/persistedState.utils';
import type { OpeningPanelProps } from './openingPanel.types';

// @FollowsBlueprint component-lookup-table
const ALL_OPENINGS_CARD_BY_MODE: ComponentByKind<Mode, SelectorCardProps> = {
  play: SelectorCard,
  learn: EmptySlot,
};

const LOAD_MORE_BY_AVAILABILITY: ComponentByFlag<LoadMoreRowProps> = {
  true: LoadMoreRow,
  false: EmptySlot,
};

const OPENING_PICK_BY_MODE: Record<Mode, (opening: Opening, scope: PlayScope) => void> = {
  learn: (opening) => setSelection(buildOpeningSelection(opening.id)),
  play: (opening, scope) => setPlayScope(toggleOpeningInPlayScope(scope, opening.id)),
};

// @FollowsBlueprint molecule-presentational
export function OpeningsPanel({
  mode,
  openings,
  selection,
  playScope,
  boardStyle,
  onAdvance,
}: OpeningPanelProps) {
  const { t } = useTranslation();
  const { visibleItems, hasMore, loadMore } = usePaginatedList(openings);
  const AllOpeningsCard = ALL_OPENINGS_CARD_BY_MODE[mode];
  const LoadMore = LOAD_MORE_BY_AVAILABILITY[`${hasMore}`];

  function pickOpening(opening: Opening): void {
    OPENING_PICK_BY_MODE[mode](opening, playScope);
    onAdvance();
  }

  function selectAllOpenings(): void {
    setPlayScope(clearOpeningsFromPlayScope(playScope));
    onAdvance();
  }

  return (
    <SelectorPanel title={t('selection.openings.title')}>
      <AllOpeningsCard
        label={t('selection.openings.all')}
        meta={t('selection.openings.opening-count', { count: openings.length })}
        isActive={playScope.openingIds.length === 0}
        onSelect={selectAllOpenings}
      />
      {visibleItems.map((opening) => (
        <SelectorCard
          key={opening.id}
          label={opening.name}
          meta={t('selection.openings.variation-count', { count: opening.variations.length })}
          isActive={isOpeningActive(mode, opening.id, selection, playScope)}
          onSelect={() => pickOpening(opening)}
          board={<MiniBoard fen={buildOpeningPreview(opening).fen} boardStyleId={boardStyle} />}
        />
      ))}
      <LoadMore label={t('common.action.load-more')} onLoadMore={loadMore} />
    </SelectorPanel>
  );
}
