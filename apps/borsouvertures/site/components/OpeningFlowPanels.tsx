import type { ReactNode } from 'react';
import { MiniBoard } from '@/components/MiniBoard';
import { SelectorCard } from '@/components/SelectorCard';
import { SelectorPanel } from '@/components/SelectorPanel';
import type { LinePreview, OpeningPreview, VariationPreview } from '@/openings/previews.utils';
import { ALL_KEY, type Selection } from '@/openings/selectors.utils';
import type { Line, Opening, Variation } from '@/openings/types';
import type { Mode, PlayScope } from '@/state/useAppState';
import type { BoardThemeId } from '@/theme/boardThemes.utils';

export interface PlayLineEntry {
  opening: Opening;
  variation: Variation;
  line: Line;
  preview: LinePreview;
}

interface LearnLineEntry {
  line: Line;
  preview: LinePreview;
}

export type LineEntry = PlayLineEntry | LearnLineEntry;

export interface VariationEntry {
  opening: Opening;
  variation: Variation;
  preview: VariationPreview;
}

function isPlayLineEntry(entry: LineEntry): entry is PlayLineEntry {
  return 'opening' in entry;
}

interface PanelLoadMoreProps {
  hasMore: boolean;
  onLoadMore: () => void;
}

function PanelLoadMore({ hasMore, onLoadMore }: PanelLoadMoreProps): ReactNode {
  if (!hasMore) return null;
  return (
    <div className="controls-row selector-load-more">
      <button type="button" className="btn" onClick={onLoadMore}>
        Load more
      </button>
    </div>
  );
}

interface OpeningsPanelProps {
  mode: Mode;
  openings: Opening[];
  visibleOpenings: Opening[];
  hasMore: boolean;
  onLoadMore: () => void;
  openingPreviews: Map<string, OpeningPreview>;
  selection: Selection;
  onChange: (selection: Selection) => void;
  playScope: PlayScope;
  onPlayScopeChange: (scope: PlayScope) => void;
  boardStyle: BoardThemeId;
  onMobileAdvance: () => void;
}

export function OpeningsPanel({
  mode,
  openings,
  visibleOpenings,
  hasMore,
  onLoadMore,
  openingPreviews,
  selection,
  onChange,
  playScope,
  onPlayScopeChange,
  boardStyle,
  onMobileAdvance,
}: OpeningsPanelProps) {
  const isPlay = mode === 'play';
  return (
    <SelectorPanel title="Openings">
      {isPlay && (
        <SelectorCard
          label="All openings"
          meta={`${openings.length} families`}
          active={playScope.openingIds.length === 0}
          onClick={() => {
            onPlayScopeChange({
              ...playScope,
              openingIds: [],
              variationIds: [],
              lineIds: [],
            });
            onMobileAdvance();
          }}
        />
      )}
      {visibleOpenings.map((opening) => {
        const preview = openingPreviews.get(opening.id);
        const activePlay = playScope.openingIds.includes(opening.id);
        return (
          <SelectorCard
            key={opening.id}
            label={opening.name}
            meta={`${opening.variations.length} variations`}
            active={isPlay ? activePlay : selection.openingId === opening.id}
            onClick={() => {
              if (isPlay) {
                const next = activePlay
                  ? playScope.openingIds.filter((id) => id !== opening.id)
                  : [...playScope.openingIds, opening.id];
                onPlayScopeChange({ ...playScope, openingIds: next });
              } else {
                onChange({
                  openingId: opening.id,
                  variationId: ALL_KEY,
                  lineId: ALL_KEY,
                });
              }
              onMobileAdvance();
            }}
            board={preview ? <MiniBoard fen={preview.fen} boardStyleId={boardStyle} /> : undefined}
          />
        );
      })}
      <PanelLoadMore hasMore={hasMore} onLoadMore={onLoadMore} />
    </SelectorPanel>
  );
}

interface VariationsPanelProps {
  mode: Mode;
  variationEntries: VariationEntry[];
  visibleVariations: VariationEntry[];
  hasMore: boolean;
  onLoadMore: () => void;
  selection: Selection;
  onChange: (selection: Selection) => void;
  playScope: PlayScope;
  onPlayScopeChange: (scope: PlayScope) => void;
  boardStyle: BoardThemeId;
  onMobileAdvance: () => void;
}

export function VariationsPanel({
  mode,
  variationEntries,
  visibleVariations,
  hasMore,
  onLoadMore,
  selection,
  onChange,
  playScope,
  onPlayScopeChange,
  boardStyle,
  onMobileAdvance,
}: VariationsPanelProps) {
  const isPlay = mode === 'play';
  return (
    <SelectorPanel title="Variations">
      {isPlay && (
        <SelectorCard
          label="All variations"
          meta={`${variationEntries.length} total`}
          active={playScope.variationIds.length === 0}
          onClick={() => {
            onPlayScopeChange({ ...playScope, variationIds: [], lineIds: [] });
            onMobileAdvance();
          }}
        />
      )}
      {visibleVariations.map(({ opening, variation, preview }) => {
        const activePlay = playScope.variationIds.includes(variation.id);
        return (
          <SelectorCard
            key={`${opening.id}-${variation.id}`}
            label={variation.name}
            meta={`${variation.lines.length} lines`}
            active={isPlay ? activePlay : selection.variationId === variation.id}
            onClick={() => {
              if (isPlay) {
                const nextOpeningIds = playScope.openingIds.includes(opening.id)
                  ? playScope.openingIds
                  : [...playScope.openingIds, opening.id];
                const nextVariationIds = activePlay
                  ? playScope.variationIds.filter((id) => id !== variation.id)
                  : [...playScope.variationIds, variation.id];
                onPlayScopeChange({
                  ...playScope,
                  openingIds: nextOpeningIds,
                  variationIds: nextVariationIds,
                });
              } else {
                onChange({
                  openingId: opening.id,
                  variationId: variation.id,
                  lineId: ALL_KEY,
                });
              }
              onMobileAdvance();
            }}
            board={<MiniBoard fen={preview.fen} boardStyleId={boardStyle} />}
          />
        );
      })}
      <PanelLoadMore hasMore={hasMore} onLoadMore={onLoadMore} />
    </SelectorPanel>
  );
}

interface LinesPanelProps {
  mode: Mode;
  lineEntries: LineEntry[];
  visibleLines: LineEntry[];
  hasMore: boolean;
  onLoadMore: () => void;
  selection: Selection;
  onChange: (selection: Selection) => void;
  playScope: PlayScope;
  onPlayScopeChange: (scope: PlayScope) => void;
  boardStyle: BoardThemeId;
}

export function LinesPanel({
  mode,
  lineEntries,
  visibleLines,
  hasMore,
  onLoadMore,
  selection,
  onChange,
  playScope,
  onPlayScopeChange,
  boardStyle,
}: LinesPanelProps) {
  const isPlay = mode === 'play';
  return (
    <SelectorPanel title="Lines">
      {isPlay && (
        <SelectorCard
          label="All lines"
          meta={`${lineEntries.length} lines`}
          active={playScope.lineIds.length === 0}
          onClick={() => onPlayScopeChange({ ...playScope, lineIds: [] })}
        />
      )}
      {visibleLines.map((entry) => {
        const { line, preview } = entry;
        const openingForLine = isPlayLineEntry(entry) ? entry.opening : undefined;
        const variationForLine = isPlayLineEntry(entry) ? entry.variation : undefined;
        const activePlay = playScope.lineIds.includes(line.id);
        return (
          <SelectorCard
            key={`${preview.variationId}-${line.id}`}
            label={line.name}
            meta={`ECO ${line.eco}`}
            active={isPlay ? activePlay : selection.lineId === line.id}
            onClick={() => {
              if (isPlay) {
                const nextOpeningIds =
                  openingForLine && !playScope.openingIds.includes(openingForLine.id)
                    ? [...playScope.openingIds, openingForLine.id]
                    : playScope.openingIds;
                const nextVariationIds =
                  variationForLine && !playScope.variationIds.includes(variationForLine.id)
                    ? [...playScope.variationIds, variationForLine.id]
                    : playScope.variationIds;
                const next = activePlay
                  ? playScope.lineIds.filter((id) => id !== line.id)
                  : [...playScope.lineIds, line.id];
                onPlayScopeChange({
                  ...playScope,
                  openingIds: nextOpeningIds,
                  variationIds: nextVariationIds,
                  lineIds: next,
                });
              } else {
                onChange({
                  openingId: selection.openingId,
                  variationId: selection.variationId,
                  lineId: line.id,
                });
              }
            }}
            board={<MiniBoard fen={preview.fen} boardStyleId={boardStyle} />}
          />
        );
      })}
      <PanelLoadMore hasMore={hasMore} onLoadMore={onLoadMore} />
    </SelectorPanel>
  );
}
