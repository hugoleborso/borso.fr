/** @Feature sessions */

import type { JSX, ReactNode } from 'react';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';
import { ListRow } from './ListRow';

export interface CheckableRowProps {
  readonly title: string;
  readonly detail: string;
  readonly leading?: ReactNode;
  readonly isChecked: boolean;
  readonly isDisabled: boolean;
  readonly onToggle: () => void;
}

// @FollowsBlueprint molecule-presentational
export function CheckableRow(props: CheckableRowProps): JSX.Element {
  return (
    <ListRow
      role="checkbox"
      aria-checked={props.isChecked}
      onClick={props.onToggle}
      disabled={props.isDisabled}
      isChevronShown={false}
      leading={props.leading}
      trailing={
        <span
          aria-hidden="true"
          className={composeClassName(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-sm border-2',
            props.isChecked ? 'border-ink bg-ink text-paper' : 'border-rule-strong',
          )}
        >
          {props.isChecked ? <Icon name="check" /> : null}
        </span>
      }
      className="min-h-14 border-b border-rule py-2"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-title text-ink">{props.title}</span>
        <span className="block truncate text-meta text-ink-soft">{props.detail}</span>
      </span>
    </ListRow>
  );
}
