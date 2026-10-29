import { type JSX, useState } from 'react';
import { revealTabInItsRow } from '../../lib/tab-reveal.adapter';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { useTabRowOverflow } from './tab-row-overflow.hook';
import { isHidingTabsAtEnd, isHidingTabsAtStart } from './tab-row-overflow.utils';

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
  readonly layout?: SectionTabsLayout;
  readonly className?: string;
}

export type SectionTabsLayout = 'inline' | 'stacked';

const TAB_CLASS =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-0 border-b-2 border-transparent ' +
  'bg-transparent px-3 text-meta font-medium text-ink-soft hover:text-ink ' +
  'aria-selected:border-ink aria-selected:text-ink focus-visible:outline-3 focus-visible:outline-focus';
const TAB_CLASS_BY_LAYOUT = {
  inline: TAB_CLASS,
  stacked: composeClassName(TAB_CLASS, 'flex-1 flex-col justify-center gap-0.5 px-0.5 text-label'),
} as const satisfies Readonly<Record<SectionTabsLayout, string>>;
const CUE_CLASS =
  'pointer-events-none absolute top-0 bottom-px flex w-10 items-center text-ink-soft from-paper';
const CUE_CLASS_BY_EDGE = {
  start: 'left-0 justify-start bg-linear-to-r',
  end: 'right-0 justify-end bg-linear-to-l',
} as const;

function OverflowCue({ edge }: { readonly edge: 'start' | 'end' }): JSX.Element {
  return (
    <span
      data-tab-overflow-cue={edge}
      aria-hidden="true"
      className={composeClassName(CUE_CLASS, CUE_CLASS_BY_EDGE[edge])}
    >
      <Icon name={edge === 'start' ? 'chevL' : 'chevR'} />
    </span>
  );
}

// @FollowsBlueprint molecule-presentational
export function SectionTabs<Value extends string>({
  label,
  tabs,
  value,
  onChange,
  layout = 'inline',
  className,
}: SectionTabsProps<Value>): JSX.Element {
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const overflow = useTabRowOverflow(row);
  const isStartCueShown = isHidingTabsAtStart(overflow);
  const isEndCueShown = isHidingTabsAtEnd(overflow);
  return (
    <div className={composeClassName('relative flex lg:w-fit lg:max-w-full', className)}>
      <div
        ref={setRow}
        role="tablist"
        aria-label={label}
        className="relative flex min-w-0 flex-auto gap-1 overflow-x-auto border-b border-rule [scrollbar-width:none]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.value}
            ref={tab.value === value ? revealTabInItsRow : undefined}
            type="button"
            role="tab"
            aria-selected={tab.value === value}
            onClick={() => onChange(tab.value)}
            className={TAB_CLASS_BY_LAYOUT[layout]}
          >
            <Icon name={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>
      {isStartCueShown ? <OverflowCue edge="start" /> : null}
      {isEndCueShown ? <OverflowCue edge="end" /> : null}
    </div>
  );
}
