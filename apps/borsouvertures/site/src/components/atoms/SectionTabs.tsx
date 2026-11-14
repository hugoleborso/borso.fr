import type { ValueByFlag } from '@/lib/componentTable.types';
import { buildTabId, buildTabPanelId } from './section-tabs.utils';

export interface SectionTab<TabId extends string> {
  id: TabId;
  label: string;
}

interface SectionTabsProps<TabId extends string> {
  tabs: readonly SectionTab<TabId>[];
  selectedId: TabId;
  ariaLabel: string;
  idPrefix: string;
  onSelect: (tabId: TabId) => void;
}

const TAB_BASE =
  'flex-1 min-w-0 min-h-11 px-2 rounded-[4px] text-[0.9375rem] font-bold leading-tight ' +
  'transition-[background-color,color] duration-150 ease-out-quick';

// @FollowsBlueprint component-lookup-table
const TAB_CLASS_BY_SELECTED: ValueByFlag<string> = {
  true: TAB_BASE + ' bg-primary text-on-primary',
  false: TAB_BASE + ' text-ink hover:bg-page',
};

// @FollowsBlueprint atom-plain
export function SectionTabs<TabId extends string>({
  tabs,
  selectedId,
  ariaLabel,
  idPrefix,
  onSelect,
}: SectionTabsProps<TabId>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-1 p-1 rounded-md bg-surface">
      {tabs.map((tab) => {
        const isSelected = tab.id === selectedId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={buildTabId(idPrefix, tab.id)}
            aria-selected={isSelected}
            aria-controls={buildTabPanelId(idPrefix, tab.id)}
            className={TAB_CLASS_BY_SELECTED[`${isSelected}`]}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
