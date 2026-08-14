/**
 * Catalog-style list view of bars: a sortable table with name, status,
 * city, capacity, and last-interaction-derived staleness columns.
 *
 * Layout is driven by `useReactTable` from `@tanstack/react-table`
 * with `getSortedRowModel()` enabled — header cells are clickable
 * to toggle sort direction (an arrow indicator sits next to the
 * label). Click on a row's name selects the bar for editing; the
 * `×` action removes it.
 *
 * The stale-banner above the list and the kanban view live in the
 * parent (`BarsPage`); this organism owns the list-view shape only.
 */

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import type { JSX, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCapacity } from '../../lib/formatters.utils';
import { Badge } from '../atoms/Badge';
import { Chip } from '../atoms/Chip';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

const MOBILE_HIDDEN_COLUMN_IDS = new Set(['city', 'capacity']);

const SORT_ARROW_ROTATION_BY_DIRECTION = {
  asc: '-rotate-90',
  desc: 'rotate-90',
} as const;

export interface BarsListRow {
  readonly id: string;
  readonly name: string;
  readonly status: 'lead' | 'contacted' | 'booked' | 'played' | 'cold';
  readonly city: string | null;
  readonly capacity: number | null;
  readonly isStale: boolean;
}

interface BarsListProps {
  readonly bars: readonly BarsListRow[];
  readonly statusLabel: (status: BarsListRow['status']) => string;
  readonly onSelect: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

// @FollowsBlueprint organism-table
export function BarsList({ bars, statusLabel, onSelect, onRemove }: BarsListProps): JSX.Element {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  const data = useMemo(() => [...bars], [bars]);

  const columns = useMemo<ColumnDef<BarsListRow>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => t('bars.name'),
        cell: ({ row }) => (
          <button
            type="button"
            className="flex flex-col items-start justify-center w-full min-h-11 text-left text-[13.5px] text-ink-900 cursor-pointer bg-transparent border-0 p-0"
            onClick={() => onSelect(row.original.id)}
          >
            {row.original.name}
            <span className="md:hidden text-xs font-mono text-ink-400">
              {row.original.city ?? ''} · {formatCapacity(row.original.capacity)}
            </span>
          </button>
        ),
        enableSorting: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => t('bars.status'),
        cell: ({ row }) => <Chip tone="default">{statusLabel(row.original.status)}</Chip>,
        enableSorting: true,
      },
      {
        id: 'stale',
        accessorFn: (row) => (row.isStale ? 1 : 0),
        header: () => t('bars.staleColumn'),
        cell: ({ row }) =>
          row.original.isStale ? <Badge tone="warn">{t('bars.staleBadge')}</Badge> : null,
        enableSorting: true,
      },
      {
        id: 'city',
        accessorKey: 'city',
        header: () => t('bars.city'),
        cell: ({ row }) => <span className="text-xs text-ink-500">{row.original.city ?? ''}</span>,
        enableSorting: true,
      },
      {
        id: 'capacity',
        accessorKey: 'capacity',
        header: () => t('bars.capacity'),
        cell: ({ row }) => (
          <span className="text-xs font-mono text-ink-400">
            {formatCapacity(row.original.capacity)}
          </span>
        ),
        enableSorting: true,
        sortUndefined: 'last',
      },
      {
        id: 'actions',
        header: () => '',
        cell: ({ row }) => (
          <button
            type="button"
            className="inline-flex items-center justify-center min-w-11 min-h-11 text-ink-400 hover:text-danger text-lg leading-none cursor-pointer bg-transparent border-0 px-1"
            onClick={() => onRemove(row.original.id)}
            aria-label={t('common.delete')}
          >
            ×
          </button>
        ),
        enableSorting: false,
      },
    ],
    [t, statusLabel, onSelect, onRemove],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <ul className="flex flex-col gap-1.5" aria-label={t('bars.title')}>
      <li className="flex items-center gap-3 px-3 text-xs tracking-wider uppercase text-ink-500 font-medium">
        {table.getHeaderGroups()[0]?.headers.map((header, index) => {
          const sortDirection = header.column.getIsSorted();
          const canSort = header.column.getCanSort();
          const className = composeClassName(
            index === 0 && 'flex-1',
            MOBILE_HIDDEN_COLUMN_IDS.has(header.column.id)
              ? 'hidden md:inline-flex'
              : 'inline-flex',
            canSort && 'cursor-pointer select-none',
          );
          return (
            <SortableHeader
              key={header.id}
              canSort={canSort}
              onToggleSorting={header.column.getToggleSortingHandler()}
              className={className}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {sortDirection ? (
                <Icon
                  name="chevR"
                  size={10}
                  className={composeClassName(
                    'inline-block ml-1',
                    SORT_ARROW_ROTATION_BY_DIRECTION[sortDirection],
                  )}
                />
              ) : null}
            </SortableHeader>
          );
        })}
      </li>
      {table.getRowModel().rows.map((row) => (
        <li
          key={row.id}
          className={composeClassName(
            'flex items-center gap-3 bg-bg-elev border border-line rounded-md px-3 py-2 hover:border-line-strong transition-colors',
            row.original.isStale && 'border-warn/40',
          )}
        >
          {row.getVisibleCells().map((cell) => {
            const isName = cell.column.id === 'name';
            const isHiddenOnMobile = MOBILE_HIDDEN_COLUMN_IDS.has(cell.column.id);
            return (
              <span
                key={cell.id}
                className={composeClassName(
                  isName && 'flex-1 min-w-0',
                  isHiddenOnMobile && 'hidden md:inline',
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </span>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

interface SortableHeaderProps {
  readonly canSort: boolean;
  readonly onToggleSorting: ((event: unknown) => void) | undefined;
  readonly className: string | undefined;
  readonly children: ReactNode;
}

/**
 * No `display` utility here: the caller decides between `inline-flex` and
 * `hidden md:inline-flex`, and a `display` in this string would win over the
 * caller's `hidden` on stylesheet order rather than on source order.
 */
const HEADER_CELL_CLASS =
  'items-center min-h-11 bg-transparent border-0 text-xs tracking-wider uppercase text-ink-500 font-medium p-0 text-left';

/**
 * A column header, rendered as a button only when the column can actually be
 * sorted. The actions column carries neither a label nor a sort, and as a
 * disabled button it put an invisible, unnamed control in the tab order.
 */
function SortableHeader({
  canSort,
  onToggleSorting,
  className,
  children,
}: SortableHeaderProps): JSX.Element {
  if (!canSort) {
    return <span className={composeClassName(className, HEADER_CELL_CLASS)}>{children}</span>;
  }
  return (
    <button
      type="button"
      onClick={onToggleSorting}
      className={composeClassName(className, HEADER_CELL_CLASS)}
    >
      {children}
    </button>
  );
}
