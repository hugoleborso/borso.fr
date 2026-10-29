/** @Feature setlists */

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
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
import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../atoms/Chip';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { EnergyCurve } from '../molecules/EnergyCurve';
import {
  arrangeByIds,
  averageEnergy,
  buildEnergyBars,
  ENERGY_METER_STEPS,
  projectOrder,
  selectMeterStep,
} from '../molecules/energy-curve.utils';
import {
  describeTotalDuration,
  formatDuration,
  sumKnownDurations,
} from '../molecules/song-duration.utils';
import { joinSummaryItems } from '../molecules/summary-line.utils';
import { restrictToVerticalAxis } from './setlist-editor.utils';

const DRAG_MODIFIERS = [restrictToVerticalAxis];
const DRAG_ACTIVATION_DISTANCE_PX = 4;
const POSITION_DIGITS = 2;
const TOTAL_DURATION_KEY = {
  minutes: 'home.totalMinutes',
  hoursMinutes: 'home.totalHoursMinutes',
} as const;

export interface OrderRow {
  readonly id: string;
  readonly title: string;
  readonly durationSeconds: number | null;
  readonly entryEnergy: number | null;
  readonly songEnergy: number | null;
}

export interface SetlistOrderListProps {
  readonly rows: readonly OrderRow[];
  readonly onReorder: (orderedIds: readonly string[]) => void;
}

interface Lift {
  readonly liftedId: string;
  readonly targetId: string | null;
}

// @FollowsBlueprint organism-presentational
export function SetlistOrderList({ rows, onReorder }: SetlistOrderListProps): JSX.Element {
  const { t } = useTranslation();
  const [isCurveShown, setIsCurveShown] = useState(true);
  const [lift, setLift] = useState<Lift | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
    useSensor(TouchSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const rowIds = rows.map((row) => row.id);
  const curveIds = lift === null ? rowIds : projectOrder(rowIds, lift.liftedId, lift.targetId);
  const bars = buildEnergyBars(arrangeByIds(rows, curveIds));
  const average = averageEnergy(bars);
  const totalSeconds = sumKnownDurations(rows.map((row) => row.durationSeconds));
  const total = totalSeconds === null ? null : describeTotalDuration(totalSeconds);
  const summary = joinSummaryItems([
    average === null ? null : t('setlist.averageEnergy', { value: average }),
    total === null
      ? null
      : t(TOTAL_DURATION_KEY[total.kind], { hours: total.hours, minutes: total.minutes }),
  ]);

  const dropLiftedRow = (event: DragEndEvent): void => {
    setLift(null);
    const targetId = event.over === null ? null : String(event.over.id);
    const dropped = projectOrder(rowIds, String(event.active.id), targetId);
    if (dropped.every((id, index) => id === rowIds[index])) return;
    onReorder(dropped);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Chip pressed={isCurveShown} onPress={() => setIsCurveShown((shown) => !shown)}>
          <Icon name="chart" />
          {t('setlist.energyCurve')}
        </Chip>
        <span className="truncate text-meta text-ink-soft">{summary}</span>
      </div>
      {isCurveShown ? <EnergyCurve bars={bars} liftedId={lift?.liftedId ?? null} /> : null}
      <DndContext
        sensors={sensors}
        modifiers={DRAG_MODIFIERS}
        collisionDetection={closestCenter}
        onDragStart={(event: DragStartEvent) =>
          setLift({ liftedId: String(event.active.id), targetId: null })
        }
        onDragOver={(event: DragOverEvent) =>
          setLift({
            liftedId: String(event.active.id),
            targetId: event.over === null ? null : String(event.over.id),
          })
        }
        onDragEnd={dropLiftedRow}
        onDragCancel={() => setLift(null)}
      >
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <ol className="m-0 flex list-none flex-col p-0">
            {rows.map((row, index) => (
              <SortableOrderRow
                key={row.id}
                row={row}
                position={index + 1}
                isLifted={lift?.liftedId === row.id}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableOrderRowProps {
  readonly row: OrderRow;
  readonly position: number;
  readonly isLifted: boolean;
}

function SortableOrderRow({ row, position, isLifted }: SortableOrderRowProps): JSX.Element {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: row.id,
  });
  const [bar] = buildEnergyBars([row]);
  const step = selectMeterStep(bar?.level ?? 0);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-order-row
      className={composeClassName(
        'flex h-11 items-center gap-2 border-b border-rule',
        isLifted && 'relative z-10 bg-raised shadow-cover',
      )}
    >
      <IconButton
        icon="drag"
        label={t('setlist.dragHandle')}
        className="cursor-grab touch-none text-ink-soft active:cursor-grabbing"
        {...attributes}
        {...listeners}
      />
      <span className="w-5 shrink-0 text-right font-mono text-label text-ink-faint">
        {String(position).padStart(POSITION_DIGITS, '0')}
      </span>
      <span className="min-w-0 flex-1 truncate font-display text-body text-ink">{row.title}</span>
      <span
        role="img"
        aria-label={t('setlist.energyStep', { step })}
        className="flex h-3 shrink-0 items-end gap-0.5"
      >
        {ENERGY_METER_STEPS.map((meterStep) => (
          <span
            key={meterStep}
            className={composeClassName(
              'w-1 rounded-sm',
              meterStep <= step ? 'h-3 bg-ink-soft' : 'h-1.5 bg-rule-strong',
            )}
          />
        ))}
      </span>
      <span className="w-10 shrink-0 text-right font-mono text-meta text-ink-soft tabular-nums">
        {row.durationSeconds === null ? '' : formatDuration(row.durationSeconds)}
      </span>
    </li>
  );
}
