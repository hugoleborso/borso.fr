import { useMemo, useState } from 'react';
import {
  type LineEntry,
  LinesPanel,
  OpeningsPanel,
  type PlayLineEntry,
  type VariationEntry,
  VariationsPanel,
} from '@/components/OpeningFlowPanels';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import {
  buildLinePreview,
  buildOpeningPreview,
  buildVariationPreview,
} from '@/openings/previews.utils';
import type { Selection } from '@/openings/selectors.utils';
import type { Opening } from '@/openings/types';
import type { Mode, PlayScope } from '@/state/useAppState';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

const PAGE_SIZE = 20;

type MobileStep = 'opening' | 'variation' | 'line';

interface OpeningFlowSelectorProps {
  openings: Opening[];
  selection: Selection;
  onChange: (selection: Selection) => void;
  boardStyle: BoardThemeId;
  mode: Mode;
  playScope: PlayScope;
  onPlayScopeChange: (scope: PlayScope) => void;
}

export function OpeningFlowSelector({
  openings,
  selection,
  onChange,
  boardStyle,
  mode,
  playScope,
  onPlayScopeChange,
}: OpeningFlowSelectorProps) {
  const { openingId, variationId } = selection;
  const isMobile = useIsMobile();
  const [mobileStep, setMobileStep] = useState<MobileStep>('opening');

  const isPlay = mode === 'play';

  const openingPreviews = useMemo(
    () => new Map(openings.map((opening) => [opening.id, buildOpeningPreview(opening)])),
    [openings],
  );

  const selectedOpening = !isPlay
    ? openings.find((opening) => opening.id === openingId)
    : undefined;
  const selectedVariation = !isPlay
    ? selectedOpening?.variations.find((variation) => variation.id === variationId)
    : undefined;

  const openingsForVariations = isPlay
    ? playScope.openingIds.length > 0
      ? openings.filter((opening) => playScope.openingIds.includes(opening.id))
      : openings
    : selectedOpening
      ? [selectedOpening]
      : openings;

  const variationEntries = useMemo<VariationEntry[]>(
    () =>
      openingsForVariations.flatMap((opening) =>
        opening.variations.map((variation) => ({
          opening,
          variation,
          preview: buildVariationPreview(opening, variation),
        })),
      ),
    [openingsForVariations],
  );

  const variationsForLines =
    isPlay && playScope.variationIds.length > 0
      ? variationEntries.filter((entry) => playScope.variationIds.includes(entry.variation.id))
      : variationEntries;

  const lineEntries = useMemo<PlayLineEntry[]>(
    () =>
      variationsForLines.flatMap(({ opening, variation }) =>
        variation.lines.map((line) => ({
          opening,
          variation,
          line,
          preview: buildLinePreview(opening, variation, line),
        })),
      ),
    [variationsForLines],
  );

  const openingsResetKey = `${mode}|${playScope.openingIds.join(',')}`;
  const variationsResetKey = `${mode}|${openingId ?? ''}|${playScope.openingIds.join(',')}|${playScope.variationIds.join(',')}`;
  const linesResetKey = `${mode}|${variationId ?? ''}|${playScope.variationIds.join(',')}|${playScope.lineIds.join(',')}`;

  const openingsPagination = usePaginatedList(openings, openingsResetKey, PAGE_SIZE);
  const variationsPagination = usePaginatedList<VariationEntry>(
    isPlay
      ? variationEntries
      : selectedOpening
        ? selectedOpening.variations.map((variation) => ({
            opening: selectedOpening,
            variation,
            preview: buildVariationPreview(selectedOpening, variation),
          }))
        : [],
    variationsResetKey,
    PAGE_SIZE,
  );
  const linesPagination = usePaginatedList<LineEntry>(
    isPlay
      ? lineEntries
      : selectedOpening && selectedVariation
        ? selectedVariation.lines.map((line) => ({
            line,
            preview: buildLinePreview(selectedOpening, selectedVariation, line),
          }))
        : [],
    linesResetKey,
    PAGE_SIZE,
  );

  const openingsPanel = (
    <OpeningsPanel
      key="openings"
      mode={mode}
      openings={openings}
      visibleOpenings={openingsPagination.visibleItems}
      hasMore={openingsPagination.hasMore}
      onLoadMore={openingsPagination.loadMore}
      openingPreviews={openingPreviews}
      selection={selection}
      onChange={onChange}
      playScope={playScope}
      onPlayScopeChange={onPlayScopeChange}
      boardStyle={boardStyle}
      onMobileAdvance={() => {
        if (isMobile) setMobileStep('variation');
      }}
    />
  );

  const variationsPanel = (
    <VariationsPanel
      key="variations"
      mode={mode}
      variationEntries={variationEntries}
      visibleVariations={variationsPagination.visibleItems}
      hasMore={variationsPagination.hasMore}
      onLoadMore={variationsPagination.loadMore}
      selection={selection}
      onChange={onChange}
      playScope={playScope}
      onPlayScopeChange={onPlayScopeChange}
      boardStyle={boardStyle}
      onMobileAdvance={() => {
        if (isMobile) setMobileStep('line');
      }}
    />
  );

  const linesPanel = (
    <LinesPanel
      key="lines"
      mode={mode}
      lineEntries={lineEntries}
      visibleLines={linesPagination.visibleItems}
      hasMore={linesPagination.hasMore}
      onLoadMore={linesPagination.loadMore}
      selection={selection}
      onChange={onChange}
      playScope={playScope}
      onPlayScopeChange={onPlayScopeChange}
      boardStyle={boardStyle}
    />
  );

  if (!isMobile) {
    return (
      <div className="selector-columns">
        {openingsPanel}
        {variationsPanel}
        {linesPanel}
      </div>
    );
  }

  return (
    <div className="selector-columns">
      <div className="selector-back">
        {mobileStep !== 'opening' && (
          <button
            type="button"
            className="btn"
            onClick={() => setMobileStep(mobileStep === 'line' ? 'variation' : 'opening')}
          >
            Back
          </button>
        )}
      </div>
      {mobileStep === 'opening' && openingsPanel}
      {mobileStep === 'variation' && variationsPanel}
      {mobileStep === 'line' && linesPanel}
    </div>
  );
}
