import type { JSX } from 'react';
import {
  Button as MenuButton,
  Menu as MenuList,
  MenuItem as MenuListItem,
  MenuTrigger,
  Popover,
} from 'react-aria-components';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';

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

const GAP_BELOW_THE_BUTTON_PX = 4;

// @FollowsBlueprint molecule-presentational
export function Menu({ label, items }: MenuProps): JSX.Element {
  return (
    <MenuTrigger>
      <MenuButton
        aria-label={label}
        render={(buttonProps) => <button {...buttonProps} title={label} />}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent text-ink hover:bg-hover"
      >
        <Icon name="more" size="md" />
      </MenuButton>
      <Popover
        aria-label={label}
        placement="bottom end"
        offset={GAP_BELOW_THE_BUTTON_PX}
        className="before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-scrim"
      >
        <MenuList
          aria-label={label}
          className="m-0 min-w-44 list-none rounded-md bg-raised p-1 text-ink shadow-raised"
        >
          {items.map((item) => (
            <MenuListItem
              key={item.label}
              textValue={item.label}
              onAction={item.onSelect}
              className={composeClassName(
                'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm border-0 bg-transparent px-3 text-left text-meta hover:bg-hover',
                ITEM_TONE_CLASS[item.tone],
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </MenuListItem>
          ))}
        </MenuList>
      </Popover>
    </MenuTrigger>
  );
}
