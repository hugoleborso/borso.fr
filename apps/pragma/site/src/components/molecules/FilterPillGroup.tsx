/**
 * FilterPillGroup — segmented control of "pill" buttons, each
 * showing a label + mono count. Matches the prototype's
 * Statuses row on the Catalog screen. Selection is exclusive
 * (radio-like): exactly one option is active at a time.
 */

import { cn } from '../atoms/cn.utils';

export interface FilterPillOption<TValue extends string> {
  value: TValue;
  label: string;
  count: number;
}

export interface FilterPillGroupProps<TValue extends string> {
  options: readonly FilterPillOption<TValue>[];
  value: TValue;
  onChange: (next: TValue) => void;
  className?: string;
}

export function FilterPillGroup<TValue extends string>({
  options,
  value,
  onChange,
  className,
}: FilterPillGroupProps<TValue>): JSX.Element {
  return (
    <div
      className={cn(
        'inline-flex gap-1 p-[3px] bg-bg-sunk rounded-lg',
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
              isActive
                ? 'bg-bg-elev text-ink-900 shadow-[0_1px_2px_rgba(26,22,18,0.06)]'
                : 'bg-transparent text-ink-500 hover:text-ink-700',
            )}
          >
            <span>{option.label}</span>
            <span className="font-mono text-ink-400 text-[10.5px]">{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
