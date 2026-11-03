import { type JSX, useId } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';
import { toAnchorName } from './menu-anchor.utils';

export interface MenuItem {
  readonly label: string;
  readonly icon: IconName;
  readonly tone: 'default' | 'danger';
  readonly onSelect: () => void;
}

export interface MenuProps {
  readonly label: string;
  readonly items: readonly MenuItem[];
}

const ITEM_TONE_CLASS = {
  default: 'text-ink',
  danger: 'text-danger',
} as const satisfies Readonly<Record<MenuItem['tone'], string>>;

// @FollowsBlueprint molecule-presentational
export function Menu({ label, items }: MenuProps): JSX.Element {
  const popoverId = useId();
  const anchorName = toAnchorName(popoverId);
  return (
    <>
      <button
        type="button"
        popoverTarget={popoverId}
        aria-label={label}
        title={label}
        style={{ anchorName }}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent text-ink hover:bg-hover"
      >
        <Icon name="more" size="md" />
      </button>
      <ul
        id={popoverId}
        popover="auto"
        data-anchored-menu
        style={{ positionAnchor: anchorName }}
        className="min-w-44 list-none rounded-md border-0 bg-raised p-1 text-ink shadow-raised"
      >
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              popoverTarget={popoverId}
              popoverTargetAction="hide"
              onClick={item.onSelect}
              className={composeClassName(
                'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-3 text-left text-meta hover:bg-hover',
                ITEM_TONE_CLASS[item.tone],
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
