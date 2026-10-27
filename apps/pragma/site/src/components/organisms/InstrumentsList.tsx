/** @Feature instruments */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { InstrumentIcon } from '@domain/instrument.core';
import type { JSX } from 'react';
import { Badge } from '../atoms/Badge';
import { composeClassName } from '../atoms/class-name.utils';
import { IconButton } from '../atoms/IconButton';
import { Icon } from '../atoms/Icon';
import {
  InstrumentPlayerChips,
  type InstrumentPlayerChip,
} from '../molecules/InstrumentPlayerChips';
import { INSTRUMENT_ICON_GLYPH } from '../molecules/lineup-slots.core';
import { ListRow } from '../molecules/ListRow';
import { restrictToVerticalAxis } from './setlist-editor.utils';

const DRAG_MODIFIERS = [restrictToVerticalAxis];
const DRAG_ACTIVATION_DISTANCE_PX = 6;
const DRAG_TOUCH_DELAY_MS = 200;
const DRAG_TOUCH_TOLERANCE_PX = 8;
const ROW_OPENING_BUTTON_CLASS = 'flex-1 text-meta after:absolute after:inset-0';

export interface InstrumentListRow {
  readonly id: string;
  readonly name: string;
  readonly icon: InstrumentIcon;
  readonly familyLabel: string;
  readonly players: readonly InstrumentPlayerChip[];
}

export interface InstrumentsListProps {
  readonly rows: readonly InstrumentListRow[];
  readonly listLabel: string;
  readonly dragHandleLabel: string;
  readonly primaryToggleLabel: string;
  readonly deleteLabel: string;
  readonly onSelect: (instrumentId: string) => void;
  readonly onTogglePrimary: (instrumentId: string, memberId: string) => void;
  readonly onDelete: (instrumentId: string) => void;
  readonly onReorder: (orderedInstrumentIds: readonly string[]) => void;
}

function InstrumentRow(
  props: Omit<InstrumentsListProps, 'rows' | 'listLabel' | 'onReorder'> & {
    readonly row: InstrumentListRow;
  },
): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.row.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={composeClassName(
        'relative flex items-center gap-2 rounded-md border border-rule bg-leaf px-2 py-2 transition-colors hover:border-rule-strong sm:gap-3 sm:px-3',
        isDragging && 'opacity-40',
      )}
    >
      <IconButton
        icon="drag"
        label={props.dragHandleLabel}
        size="sm"
        className="relative z-10 shrink-0 cursor-grab touch-none text-ink-faint active:cursor-grabbing"
        {...attributes}
        {...listeners}
      />
      <Icon name={INSTRUMENT_ICON_GLYPH[props.row.icon]} size="md" />
      <ListRow className={ROW_OPENING_BUTTON_CLASS} onClick={() => props.onSelect(props.row.id)}>
        {props.row.name}
      </ListRow>
      <InstrumentPlayerChips
        players={props.row.players}
        toggleLabel={props.primaryToggleLabel}
        onTogglePrimary={(memberId) => props.onTogglePrimary(props.row.id, memberId)}
      />
      <Badge tone="mono">{props.row.familyLabel}</Badge>
      <IconButton
        icon="trash"
        variant="danger"
        label={props.deleteLabel}
        className="relative z-10"
        onClick={() => props.onDelete(props.row.id)}
      />
    </li>
  );
}

// @FollowsBlueprint organism-presentational
export function InstrumentsList({
  rows,
  listLabel,
  onReorder,
  ...rowProps
}: InstrumentsListProps): JSX.Element {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: DRAG_TOUCH_DELAY_MS, tolerance: DRAG_TOUCH_TOLERANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commitDragReorder = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const ordered = rows.map((row) => row.id);
    const fromIndex = ordered.indexOf(String(active.id));
    const toIndex = ordered.indexOf(String(over.id));
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...ordered];
    const [moved] = next.splice(fromIndex, 1);
    if (moved === undefined) return;
    next.splice(toIndex, 0, moved);
    onReorder(next);
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={DRAG_MODIFIERS}
      collisionDetection={closestCenter}
      onDragEnd={commitDragReorder}
    >
      <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-1.5" aria-label={listLabel}>
          {rows.map((row) => (
            <InstrumentRow key={row.id} row={row} {...rowProps} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
