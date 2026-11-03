import { type JSX, type MouseEvent, useId } from 'react';
import { closeOnBackdropTap } from '../../lib/modal-dialog.adapter';
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

function closeEnclosingMenu(event: MouseEvent<HTMLButtonElement>): void {
  event.currentTarget.closest('dialog')?.close();
}

function openMenuOfButton(event: MouseEvent<HTMLButtonElement>): void {
  const menu = event.currentTarget.nextElementSibling;
  if (menu instanceof HTMLDialogElement) menu.showModal();
}

// @FollowsBlueprint molecule-presentational
export function Menu({ label, items }: MenuProps): JSX.Element {
  const anchorName = toAnchorName(useId());
  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        onClick={openMenuOfButton}
        aria-label={label}
        title={label}
        style={{ anchorName }}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent text-ink hover:bg-hover"
      >
        <Icon name="more" size="md" />
      </button>
      {/* eslint-disable-next-line borso/no-raw-interactive-element -- a menu is a short list anchored to its button, not a sheet: no grabber, no title bar, no footer; it reuses the sheet's scrim and backdrop-tap close */}
      <dialog
        ref={closeOnBackdropTap}
        aria-label={label}
        data-anchored-menu
        style={{ positionAnchor: anchorName }}
        className="min-w-44 rounded-md border-0 bg-raised p-0 text-ink shadow-raised backdrop:bg-scrim"
      >
        <ul className="m-0 list-none p-1">
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
      </dialog>
    </>
  );
}
