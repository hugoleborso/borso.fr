/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../atoms/Avatar';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { MemberMark } from '../atoms/MemberMark';
import { memberInitial } from '../atoms/member-palette.utils';
import { ListRow } from '../molecules/ListRow';
import {
  hasLineupChanges,
  type LineupGrid,
  type LineupGridCell,
  type LineupGridGlyph,
  type LineupGridRow,
} from './lineup-grid.core';

export interface SetlistLineupGridProps {
  readonly grid: LineupGrid;
  readonly onOpenCell: (entryId: string) => void;
  readonly onOpenMember: (memberId: string) => void;
}

const COLUMNS_CLASS_BY_COUNT = [
  'grid-cols-[7rem_repeat(1,minmax(0,1fr))]',
  'grid-cols-[7rem_repeat(2,minmax(0,1fr))]',
  'grid-cols-[7rem_repeat(3,minmax(0,1fr))]',
  'grid-cols-[7rem_repeat(4,minmax(0,1fr))]',
  'grid-cols-[7rem_repeat(5,minmax(0,1fr))]',
  'grid-cols-[7rem_repeat(6,minmax(0,1fr))]',
] as const;
const WIDEST_COLUMNS_CLASS = 'grid-cols-[7rem_repeat(6,minmax(0,1fr))]';
const POSITION_DIGITS = 2;
const NAME_SEPARATOR = ', ';
const CELL_BUTTON_CLASS =
  'relative items-stretch justify-center gap-0 after:absolute after:inset-x-0 after:-inset-y-1 after:content-[""]';
const COMPACT_CELL_CLASS = 'min-h-7';
const FULL_CELL_CLASS = 'min-h-11';
const JOINED_CELL_CLASS = '-mt-1';
const MARK_CLASS = 'min-h-0 w-full min-w-0 flex-col gap-0 rounded-none px-0.5';
const RUN_START_CORNERS_CLASS = 'rounded-t-sm';
const RUN_END_CORNERS_CLASS = 'rounded-b-sm';
const JOINED_MARK_CLASS = 'text-ink';
const JOINED_GLYPHS_CLASS = 'opacity-40';
const HEADER_BUTTON_CLASS = 'min-w-0 flex-col justify-center gap-0 py-0.5';

function columnsClassFor(count: number): string {
  return COLUMNS_CLASS_BY_COUNT[count - 1] ?? WIDEST_COLUMNS_CLASS;
}

function namesOf(glyphs: readonly LineupGridGlyph[]): string {
  return glyphs.map((glyph) => glyph.name).join(NAME_SEPARATOR);
}

interface GlyphLineProps {
  readonly glyphs: readonly LineupGridGlyph[];
  readonly className?: string;
}

function GlyphLine({ glyphs, className }: GlyphLineProps): JSX.Element {
  return (
    <span className={composeClassName('flex items-center justify-center gap-0.5', className)}>
      {glyphs.map((glyph) => (
        <Icon key={glyph.instrumentId} name={glyph.glyph} />
      ))}
    </span>
  );
}

interface LineupCellProps {
  readonly row: LineupGridRow;
  readonly cell: LineupGridCell;
  readonly onOpen: () => void;
}

function useCellLabel(row: LineupGridRow, cell: LineupGridCell): string {
  const { t } = useTranslation();
  const label = cell.isPlaying
    ? t('setlist.lineupCellPlays', {
        title: row.title,
        name: cell.firstName,
        instrumentNames: namesOf(cell.glyphs),
      })
    : t('setlist.lineupCellSitsOut', { title: row.title, name: cell.firstName });
  if (!cell.isChanged) return label;
  const change =
    cell.previousGlyphs.length > 0
      ? t('setlist.lineupCellPlayedBefore', { instrumentNames: namesOf(cell.previousGlyphs) })
      : t('setlist.lineupCellChanged');
  return `${label} ${change}`;
}

function PlayingMark({ cell }: { readonly cell: LineupGridCell }): JSX.Element {
  const corners = composeClassName(
    !cell.joinsPrevious && RUN_START_CORNERS_CLASS,
    !cell.joinsNext && RUN_END_CORNERS_CLASS,
  );
  if (cell.joinsPrevious) {
    return (
      <MemberMark
        shape="lane"
        color={cell.color}
        className={composeClassName(MARK_CLASS, JOINED_MARK_CLASS, corners)}
      >
        <GlyphLine glyphs={cell.glyphs} className={JOINED_GLYPHS_CLASS} />
      </MemberMark>
    );
  }
  return (
    <MemberMark shape="cell" color={cell.color} className={composeClassName(MARK_CLASS, corners)}>
      <GlyphLine glyphs={cell.glyphs} />
    </MemberMark>
  );
}

function LineupCell({ row, cell, onOpen }: LineupCellProps): JSX.Element {
  const label = useCellLabel(row, cell);
  return (
    <ListRow
      isChevronShown={false}
      aria-label={label}
      data-lineup-cell={cell.memberId}
      data-lineup-playing={cell.isPlaying}
      data-lineup-changed={cell.isChanged}
      data-lineup-joins-previous={cell.joinsPrevious}
      onClick={onOpen}
      className={composeClassName(
        CELL_BUTTON_CLASS,
        row.isCompact ? COMPACT_CELL_CLASS : FULL_CELL_CLASS,
        cell.joinsPrevious && JOINED_CELL_CLASS,
      )}
    >
      {cell.isPlaying ? <PlayingMark cell={cell} /> : null}
    </ListRow>
  );
}

function RowTitle({ row }: { readonly row: LineupGridRow }): JSX.Element {
  const { t } = useTranslation();
  const isBadgeShown = hasLineupChanges(row);
  return (
    <div className="flex min-w-0 flex-col justify-center gap-0.5 px-1">
      <p className="m-0 flex min-w-0 items-baseline gap-1.5 text-label leading-4 text-ink">
        <span className="shrink-0 font-mono text-ink-faint">
          {String(row.position).padStart(POSITION_DIGITS, '0')}
        </span>
        <span className="truncate font-medium">{row.title}</span>
      </p>
      {isBadgeShown ? (
        <span
          data-lineup-change-badge
          className="inline-flex w-fit items-center gap-0.5 rounded-pill bg-highlight px-1.5 text-label leading-4 text-on-highlight"
        >
          <Icon name="swap" className="size-3" />
          <span aria-hidden="true">{row.changeCount}</span>
          <span className="sr-only">
            {t('setlist.lineupRowChanges', { count: row.changeCount })}
          </span>
        </span>
      ) : null}
    </div>
  );
}

// @FollowsBlueprint organism-presentational
export function SetlistLineupGrid({
  grid,
  onOpenCell,
  onOpenMember,
}: SetlistLineupGridProps): JSX.Element {
  const { t } = useTranslation();
  const columnsClass = columnsClassFor(grid.columns.length);
  return (
    <div data-lineup-grid>
      <div className={composeClassName('grid gap-x-1 pt-1', columnsClass)}>
        <span aria-hidden="true" />
        {grid.columns.map((column) => (
          <ListRow
            key={column.memberId}
            isChevronShown={false}
            aria-label={t('setlist.lineupOpenMemberPart', { name: column.firstName })}
            onClick={() => onOpenMember(column.memberId)}
            className={HEADER_BUTTON_CLASS}
          >
            <Avatar initials={memberInitial(column.firstName)} color={column.color} size="xs" />
            <span className="max-w-full truncate text-label font-medium text-ink">
              {column.firstName}
            </span>
          </ListRow>
        ))}
      </div>
      <ol className="m-0 flex list-none flex-col p-0">
        {grid.rows.map((row) => (
          <li
            key={row.entryId}
            data-lineup-row={row.entryId}
            className={composeClassName('grid gap-x-1 pt-1', columnsClass)}
          >
            <RowTitle row={row} />
            {row.cells.map((cell) => (
              <LineupCell
                key={cell.memberId}
                row={row}
                cell={cell}
                onOpen={() => onOpenCell(row.entryId)}
              />
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}
