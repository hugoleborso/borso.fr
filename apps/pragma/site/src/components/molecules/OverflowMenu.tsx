import type { JSX, MouseEvent } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon, type IconName } from '../atoms/Icon';

export interface OverflowMenuItem {
  readonly label: string;
  readonly icon: IconName;
  readonly tone: 'default' | 'danger';
  readonly onSelect: () => void;
}

export interface OverflowMenuProps {
  readonly label: string;
  readonly items: readonly OverflowMenuItem[];
}

const ITEM_TONE_CLASS = {
  default: 'text-ink-900',
  danger: 'text-danger',
} as const satisfies Readonly<Record<OverflowMenuItem['tone'], string>>;

function closeEnclosingMenu(event: MouseEvent<HTMLButtonElement>): void {
  event.currentTarget.closest('details')?.removeAttribute('open');
}

// @FollowsBlueprint molecule-presentational
export function OverflowMenu({ label, items }: OverflowMenuProps): JSX.Element {
  return (
    <details className="relative">
      <summary
        aria-label={label}
        title={label}
        className="list-none inline-flex items-center justify-center size-11 rounded-md cursor-pointer text-ink-700 hover:bg-[rgba(26,22,18,0.05)]"
      >
        <Icon name="more" size={20} />
      </summary>
      <ul className="absolute right-0 top-full z-30 mt-1 min-w-44 list-none m-0 p-1 rounded-lg border border-line bg-bg-elev shadow-lg">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              onClick={(event) => {
                closeEnclosingMenu(event);
                item.onSelect();
              }}
              className={composeClassName(
                'flex w-full items-center gap-2 min-h-11 px-3 rounded-md bg-transparent border-0 cursor-pointer text-sm text-left hover:bg-bg-sunk',
                ITEM_TONE_CLASS[item.tone],
              )}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
