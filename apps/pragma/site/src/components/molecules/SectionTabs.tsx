import type { JSX } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';

export interface SectionTab<Value extends string> {
  readonly value: Value;
  readonly label: string;
  readonly icon: IconName;
}

export interface SectionTabsProps<Value extends string> {
  readonly label: string;
  readonly tabs: readonly SectionTab<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  readonly className?: string;
}

const TAB_CLASS =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-0 border-b-2 border-transparent ' +
  'bg-transparent px-3 text-meta font-medium text-ink-soft hover:text-ink ' +
  'aria-selected:border-ink aria-selected:text-ink focus-visible:outline-3 focus-visible:outline-focus';

// @FollowsBlueprint molecule-presentational
export function SectionTabs<Value extends string>({
  label,
  tabs,
  value,
  onChange,
  className,
}: SectionTabsProps<Value>): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={composeClassName('flex gap-1 overflow-x-auto border-b border-rule', className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={TAB_CLASS}
        >
          <Icon name={tab.icon} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
