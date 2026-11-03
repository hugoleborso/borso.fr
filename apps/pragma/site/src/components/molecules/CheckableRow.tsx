/** @Feature sessions */

import type { JSX, ReactNode } from 'react';
import { CheckboxButton, CheckboxField } from 'react-aria-components';
import { composeClassName } from '../atoms/class-name.utils';
import { Icon } from '../atoms/Icon';

export interface CheckableRowProps {
  readonly title: string;
  readonly detail: string;
  readonly leading?: ReactNode;
  readonly isChecked: boolean;
  readonly isDisabled: boolean;
  readonly onToggle: () => void;
}

const ROW_CLASS =
  'relative flex w-full min-h-14 cursor-pointer items-center gap-3 border-0 border-b border-rule bg-transparent ' +
  'p-0 py-2 text-left text-ink data-disabled:cursor-not-allowed ' +
  'data-focus-visible:outline-3 data-focus-visible:outline-focus';

// @FollowsBlueprint molecule-presentational
export function CheckableRow(props: CheckableRowProps): JSX.Element {
  return (
    <CheckboxField
      isSelected={props.isChecked}
      onChange={props.onToggle}
      isDisabled={props.isDisabled}
    >
      <CheckboxButton className={ROW_CLASS}>
        {props.leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-title text-ink">{props.title}</span>
          <span className="block truncate text-meta text-ink-soft">{props.detail}</span>
        </span>
        <span
          aria-hidden="true"
          className={composeClassName(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-sm border-2',
            props.isChecked ? 'border-ink bg-ink text-paper' : 'border-rule-strong',
          )}
        >
          {props.isChecked ? <Icon name="check" /> : null}
        </span>
      </CheckboxButton>
    </CheckboxField>
  );
}
