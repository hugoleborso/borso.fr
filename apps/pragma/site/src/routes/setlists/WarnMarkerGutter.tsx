/**
 * Left-of-list gutter that renders one warn marker per consecutive
 * `warn` transition between setlist entries. Each marker is positioned
 * absolutely at the midpoint between the two rows it spans (computed
 * from the same row-height + gap constants as `SetlistEditor.tsx`).
 *
 * Rendered only on viewports wide enough to dedicate gutter space
 * (`lg:` and up). On narrow viewports the per-row mobile button in
 * `SetlistEntryRow.tsx` (`showTransitionWarningBefore`) is the
 * surface the operator taps instead.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/atoms/Icon';

const ROW_HEIGHT_PX = 84;
const ROW_GAP_PX = 8;
const WARN_MARKER_OFFSET_PX = 12;

export interface WarnMarkerGutterProps {
  readonly transitions: readonly ('safe' | 'warn')[];
  readonly entries: readonly { id: string; songId: string }[];
  readonly onOpenTransition: (leftSongId: string, rightSongId: string) => void;
}

// @FollowsBlueprint organism-presentational
export function WarnMarkerGutter(props: WarnMarkerGutterProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className="absolute -left-6 top-0 bottom-0 w-5 pointer-events-none lg:block hidden"
      aria-hidden="true"
    >
      {props.transitions.map((kind, gapIndex) => {
        if (kind !== 'warn') return null;
        const leftEntry = props.entries[gapIndex];
        const rightEntry = props.entries[gapIndex + 1];
        if (leftEntry === undefined || rightEntry === undefined) return null;
        const offsetPx = (gapIndex + 1) * (ROW_HEIGHT_PX + ROW_GAP_PX) - WARN_MARKER_OFFSET_PX;
        return (
          <button
            key={`gap-${gapIndex}`}
            type="button"
            className="pointer-events-auto absolute left-0 w-5 h-5 rounded-full bg-warn text-bg-elev font-bold text-[11px] inline-flex items-center justify-center cursor-pointer border-0 shadow-[0_2px_6px_rgba(184,132,26,0.4)] hover:opacity-90"
            style={{ top: offsetPx }}
            aria-label={t('setlist.openTransitionComment')}
            onClick={() => props.onOpenTransition(leftEntry.songId, rightEntry.songId)}
          >
            <Icon name="warn" size={12} />
          </button>
        );
      })}
    </div>
  );
}
