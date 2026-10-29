/** @Feature setlists */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../atoms/Avatar';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { MemberMark } from '../atoms/MemberMark';
import { memberInitial } from '../atoms/member-palette.utils';
import { ListRow } from '../molecules/ListRow';
import type { LineupGrid, LineupGridCell, LineupGridRow } from './lineup-grid.core';

export interface SetlistLineupGridProps {
  readonly grid: LineupGrid;
  readonly onOpenCell: (entryId: string) => void;
  readonly onOpenMember: (memberId: string) => void;
}

const COLUMNS_CLASS_BY_COUNT = [
  'grid-cols-1',
  'grid-cols-2',
  'grid-cols-3',
  'grid-cols-4',
  'grid-cols-5',
  'grid-cols-6',
] as const;
const WIDEST_COLUMNS_CLASS = 'grid-cols-6';
const POSITION_DIGITS = 2;
const NAME_SEPARATOR = ', ';
const CELL_BUTTON_CLASS =
  'relative min-h-9 justify-center gap-0 after:absolute after:inset-x-0 after:-inset-y-1 after:content-[""]';
const HEADER_BUTTON_CLASS = 'min-w-0 flex-col justify-center gap-0 py-0.5';

function columnsClassFor(count: number): string {
  return COLUMNS_CLASS_BY_COUNT[count - 1] ?? WIDEST_COLUMNS_CLASS;
}

interface LineupCellProps {
  readonly row: LineupGridRow;
  readonly cell: LineupGridCell;
  readonly onOpen: () => void;
}

function LineupCell({ row, cell, onOpen }: LineupCellProps): JSX.Element {
  const { t } = useTranslation();
  const instrumentNames = cell.glyphs.map((glyph) => glyph.name).join(NAME_SEPARATOR);
  const label = cell.isPlaying
    ? t('setlist.lineupCellPlays', { title: row.title, name: cell.firstName, instrumentNames })
    : t('setlist.lineupCellSitsOut', { title: row.title, name: cell.firstName });
  return (
    <ListRow
      isChevronShown={false}
      aria-label={cell.isChanged ? `${label} ${t('setlist.lineupCellChanged')}` : label}
      data-lineup-cell={cell.memberId}
      data-lineup-playing={cell.isPlaying}
      data-lineup-changed={cell.isChanged}
      onClick={onOpen}
      className={CELL_BUTTON_CLASS}
    >
      {cell.isPlaying ? (
        <MemberMark shape="cell" color={cell.color} className="relative min-h-9 w-full">
          {cell.glyphs.map((glyph) => (
            <Icon key={glyph.instrumentId} name={glyph.glyph} />
          ))}
          {cell.isChanged ? (
            <>
              <span
                aria-hidden="true"
                className="absolute inset-x-2 bottom-1 h-1 rounded-pill bg-highlight"
              />
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 size-2 border-t-2 border-r-2 border-ink"
              />
            </>
          ) : null}
        </MemberMark>
      ) : (
        <MemberMark shape="dot" color={cell.color} />
      )}
    </ListRow>
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
    <div className="relative" data-lineup-grid>
      <div
        aria-hidden="true"
        className={composeClassName('absolute inset-0 grid gap-x-1', columnsClass)}
      >
        {grid.columns.map((column) => (
          <MemberMark
            key={column.memberId}
            shape="lane"
            color={column.color}
            className="rounded-md"
            data-lineup-lane={column.memberId}
          />
        ))}
      </div>
      <div className={composeClassName('relative grid gap-x-1 pt-1', columnsClass)}>
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
      <ol className="relative m-0 flex list-none flex-col p-0">
        {grid.rows.map((row) => (
          <li
            key={row.entryId}
            data-lineup-row={row.entryId}
            className="flex flex-col gap-0.5 pt-1"
          >
            <p className="m-0 flex min-w-0 items-baseline gap-1.5 px-1 text-label leading-4 text-ink">
              <span className="shrink-0 font-mono text-ink-faint">
                {String(row.position).padStart(POSITION_DIGITS, '0')}
              </span>
              <span className="truncate font-medium">{row.title}</span>
            </p>
            <div className={composeClassName('grid gap-x-1', columnsClass)}>
              {row.cells.map((cell) => (
                <LineupCell
                  key={cell.memberId}
                  row={row}
                  cell={cell}
                  onOpen={() => onOpenCell(row.entryId)}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
