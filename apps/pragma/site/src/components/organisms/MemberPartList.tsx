/** @Feature home */

import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../atoms/Icon';
import { MemberPartGlyphs } from '../molecules/MemberPartGlyphs';
import type { MemberPartRow } from '../../routes/home/home.core';

export interface MemberPartListProps {
  readonly label: string;
  readonly rows: readonly MemberPartRow[];
  readonly path: string;
}

// @FollowsBlueprint organism-presentational
export function MemberPartList({ label, rows, path }: MemberPartListProps): JSX.Element {
  return (
    <ul
      aria-label={label}
      className="m-0 flex list-none flex-col divide-y divide-rule rounded-md bg-leaf p-0 shadow-leaf"
    >
      {rows.map((row) => (
        <li key={row.entryId}>
          <Link
            to={path}
            className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-body text-ink no-underline hover:bg-hover"
          >
            <span className="min-w-0 flex-1 truncate">{row.songTitle}</span>
            <MemberPartGlyphs parts={row.parts} size="sm" />
            <Icon name="chevR" className="shrink-0 text-ink-faint" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
