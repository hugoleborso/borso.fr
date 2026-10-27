import type { JSX, MouseEvent } from 'react';
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

function closeEnclosingMenu(event: MouseEvent<HTMLButtonElement>): void {
  event.currentTarget.closest('details')?.removeAttribute('open');
}

// @FollowsBlueprint molecule-presentational
export function Menu({ label, items }: MenuProps): JSX.Element {
  return (
    <details className="relative">
      <summary
        aria-label={label}
        title={label}
        className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-pill text-ink hover:bg-hover"
      >
        <Icon name="more" size="md" />
      </summary>
      <ul className="absolute top-full right-0 z-30 m-0 mt-1 min-w-44 list-none rounded-md bg-raised p-1 shadow-raised">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={(event) => {
                closeEnclosingMenu(event);
                item.onSelect();
              }}
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
    </details>
  );
}
