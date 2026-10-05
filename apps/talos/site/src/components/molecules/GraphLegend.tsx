import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';

export interface GraphLegendEntry {
  readonly type: string;
  readonly label: string;
  readonly colorVariable: string;
  readonly count: number;
  readonly isHidden: boolean;
}

export interface GraphLegendProps {
  readonly label: string;
  readonly entries: readonly GraphLegendEntry[];
  readonly onToggle: (type: string) => void;
}

// @FollowsBlueprint molecule-presentational
export function GraphLegend({ label, entries, onToggle }: GraphLegendProps): JSX.Element {
  return (
    <ul aria-label={label} className="m-0 p-0 list-none flex flex-wrap gap-1.5">
      {entries.map((entry) => (
        <li key={entry.type}>
          <button
            type="button"
            aria-pressed={!entry.isHidden}
            onClick={() => onToggle(entry.type)}
            className={composeClassName(
              'inline-flex items-center gap-1.5 min-h-9 px-2.5 rounded-sm border text-label cursor-pointer transition-colors duration-[120ms]',
              entry.isHidden
                ? 'border-dashed border-line-strong bg-transparent text-ink-muted'
                : 'border-line bg-surface text-ink-soft',
            )}
          >
            <span
              className={composeClassName(
                'w-2.5 h-2.5 rounded-full border-2',
                entry.isHidden ? 'bg-transparent' : '',
              )}
              style={{
                borderColor: `var(${entry.colorVariable})`,
                backgroundColor: entry.isHidden ? 'transparent' : `var(${entry.colorVariable})`,
              }}
            />
            {entry.label}
            <span className="text-ink-muted font-normal">{entry.count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
