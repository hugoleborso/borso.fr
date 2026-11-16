import { type JSX, useState } from 'react';
import { type Key, Tab, TabList, Tabs } from 'react-aria-components';
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
  readonly tone?: SectionTabsTone;
  readonly className?: string;
}

export type SectionTabsLayout = 'inline' | 'stacked';
export type SectionTabsTone = 'paper' | 'stage';

const TAB_CLASS =
  'inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-0 border-b-2 border-transparent ' +
  'bg-transparent px-3 text-center text-meta font-medium focus-visible:outline-3 focus-visible:outline-focus';
const TAB_TONE_CLASS = {
  paper: 'text-ink-soft hover:text-ink aria-selected:border-ink aria-selected:text-ink',
  stage:
    'text-stage-ink-dim hover:text-stage-ink aria-selected:border-stage-ink aria-selected:text-stage-ink',
} as const satisfies Readonly<Record<SectionTabsTone, string>>;
const ROW_TONE_CLASS = {
  paper: 'border-rule',
  stage: 'border-stage-line',
} as const satisfies Readonly<Record<SectionTabsTone, string>>;
const CUE_TONE_CLASS = {
  paper: 'text-ink-soft from-paper',
  stage: 'text-stage-ink-dim from-stage-bg',
} as const satisfies Readonly<Record<SectionTabsTone, string>>;
const TAB_CLASS_BY_LAYOUT = {
  inline: TAB_CLASS,
  stacked: composeClassName(
    TAB_CLASS,
    'flex-1 flex-col justify-center gap-0.5 px-0.5 text-label whitespace-nowrap lg:px-3',
  ),
} as const satisfies Readonly<Record<SectionTabsLayout, string>>;
const CUE_CLASS = 'pointer-events-none absolute top-0 bottom-px flex w-10 items-center';
const CUE_CLASS_BY_EDGE = {
  start: 'left-0 justify-start bg-linear-to-r',
  end: 'right-0 justify-end bg-linear-to-l',
} as const;

interface OverflowCueProps {
  readonly edge: 'start' | 'end';
  readonly tone: SectionTabsTone;
}

function OverflowCue({ edge, tone }: OverflowCueProps): JSX.Element {
  return (
    <span
      data-tab-overflow-cue={edge}
      aria-hidden="true"
      className={composeClassName(CUE_CLASS, CUE_TONE_CLASS[tone], CUE_CLASS_BY_EDGE[edge])}
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
  tone = 'paper',
  className,
}: SectionTabsProps<Value>): JSX.Element {
  const [row, setRow] = useState<HTMLDivElement | null>(null);
  const overflow = useTabRowOverflow(row);
  const isStartCueShown = isHidingTabsAtStart(overflow);
  const isEndCueShown = isHidingTabsAtEnd(overflow);
  const selectTab = (key: Key): void => {
    const chosen = tabs.find((tab) => tab.value === key);
    if (chosen !== undefined) onChange(chosen.value);
  };
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={selectTab}
      keyboardActivation="manual"
      className={composeClassName('relative flex lg:w-fit lg:max-w-full', className)}
    >
      <TabList
        ref={setRow}
        aria-label={label}
        className={composeClassName(
          'relative flex min-w-0 flex-auto gap-1 overflow-x-auto overflow-y-hidden transform-gpu border-b [scrollbar-width:none]',
          ROW_TONE_CLASS[tone],
        )}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            id={tab.value}
            ref={tab.value === value ? revealTabInItsRow : undefined}
            className={composeClassName(TAB_CLASS_BY_LAYOUT[layout], TAB_TONE_CLASS[tone])}
          >
            <Icon name={tab.icon} />
            {tab.label}
          </Tab>
        ))}
      </TabList>
      {isStartCueShown ? <OverflowCue edge="start" tone={tone} /> : null}
      {isEndCueShown ? <OverflowCue edge="end" tone={tone} /> : null}
    </Tabs>
  );
}
