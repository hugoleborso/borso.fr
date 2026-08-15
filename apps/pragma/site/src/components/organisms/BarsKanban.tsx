/**
 * Kanban view of the bars CRM: one column per `BarStatus`, cards dragged
 * between columns to change a bar's status.
 *
 * HTML5 drag suffices here — the design bundle's handle pattern applies to
 * the mobile setlist reorder, not to this desktop board. Touch input fires no
 * drag event at all, which is why `BarsPage` shows this board only from `lg`
 * up and renders the list below it.
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCapacity } from '../../lib/formatters.utils';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';

const KANBAN_CARD_TONE = {
  stale: 'border-warn/40',
  fresh: '',
} as const;

const DRAGGED_BAR_MIME = 'text/plain';

export interface BarsKanbanCard {
  readonly id: string;
  readonly name: string;
  readonly city: string | null;
  readonly capacity: number | null;
  readonly contactName: string | null;
  readonly isStale: boolean;
}

interface BarsKanbanProps<TStatus extends string> {
  readonly statuses: readonly TStatus[];
  readonly cardsByStatus: Readonly<Record<TStatus, readonly BarsKanbanCard[]>>;
  readonly statusLabel: (status: TStatus) => string;
  readonly onSelect: (barId: string) => void;
  readonly onMoveToStatus: (status: TStatus, draggedBarId: string) => void;
}

// @FollowsBlueprint organism-presentational
export function BarsKanban<TStatus extends string>(props: BarsKanbanProps<TStatus>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3.5 overflow-x-auto">
      {props.statuses.map((status) => (
        <section
          key={status}
          className="bg-bg-sunk rounded-lg p-3 min-h-[480px] flex flex-col gap-2"
          aria-label={props.statusLabel(status)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            props.onMoveToStatus(status, event.dataTransfer.getData(DRAGGED_BAR_MIME));
          }}
        >
          <h3 className="font-medium text-xs tracking-wider uppercase text-ink-500 mx-1 mt-1 mb-1.5 flex items-center gap-2">
            {props.statusLabel(status)}
            <span className="font-mono text-ink-400">{props.cardsByStatus[status].length}</span>
          </h3>
          {props.cardsByStatus[status].map((card) => (
            <button
              key={card.id}
              type="button"
              className={composeClassName(
                'block w-full text-left bg-bg-elev border border-line rounded-md px-3 py-2.5 cursor-grab hover:border-line-strong transition-colors',
                KANBAN_CARD_TONE[card.isStale ? 'stale' : 'fresh'],
              )}
              draggable
              onDragStart={(event) => event.dataTransfer.setData(DRAGGED_BAR_MIME, card.id)}
              onClick={() => props.onSelect(card.id)}
            >
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-900 mb-1">
                {card.name}
                {card.isStale ? <Badge tone="warn">{t('bars.staleBadge')}</Badge> : null}
              </div>
              <div className="text-xs font-mono text-ink-400 tracking-wide">
                {card.city ?? ''} · {formatCapacity(card.capacity)}
              </div>
              {card.contactName === null ? null : (
                <div className="text-xs text-ink-500 mt-1.5">{card.contactName}</div>
              )}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
