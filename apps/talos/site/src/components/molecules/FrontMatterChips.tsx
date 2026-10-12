import type { JSX } from 'react';
import { Chip } from '../atoms/Chip';

export interface FrontMatterChipsProps {
  readonly entries: readonly (readonly [string, string])[];
}

// @FollowsBlueprint molecule-presentational
export function FrontMatterChips({ entries }: FrontMatterChipsProps): JSX.Element {
  return (
    <ul className="m-0 mb-4 p-0 list-none flex flex-wrap gap-1.5">
      {entries.map(([key, value]) => (
        <li key={key} className="max-w-full">
          <Chip tone="outline" className="max-w-full">
            <span className="text-ink-muted font-normal">{key}</span>
            <span className="truncate text-ink-soft">{value}</span>
          </Chip>
        </li>
      ))}
    </ul>
  );
}
