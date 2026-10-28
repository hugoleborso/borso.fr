import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

interface RoundActionCommon {
  readonly icon: IconName;
  readonly label: string;
}

export type RoundActionProps = RoundActionCommon &
  (
    | {
        readonly kind: 'button';
        readonly onPress: () => void;
        readonly isPressed?: boolean;
        readonly isDisabled?: boolean;
      }
    | { readonly kind: 'link'; readonly to: string }
    | { readonly kind: 'anchor'; readonly href: string }
  );

const ACTION_CLASS =
  'group inline-flex min-w-16 cursor-pointer flex-col items-center gap-1 border-0 bg-transparent p-0 ' +
  'text-label font-medium text-ink no-underline disabled:cursor-not-allowed disabled:text-ink-faint ' +
  'focus-visible:outline-3 focus-visible:outline-focus';
const DISC_CLASS =
  'inline-flex size-13 items-center justify-center rounded-pill bg-glass text-accent ' +
  'transition-[background-color,transform] duration-150 group-hover:bg-hover group-active:scale-[0.97] ' +
  'group-aria-pressed:bg-ink group-aria-pressed:text-paper group-disabled:text-ink-faint';

// @FollowsBlueprint atom-plain
export function RoundAction(props: RoundActionProps): JSX.Element {
  const content = (
    <>
      <span className={DISC_CLASS}>
        <Icon name={props.icon} size="md" />
      </span>
      <span>{props.label}</span>
    </>
  );
  if (props.kind === 'link') {
    return (
      <Link to={props.to} className={ACTION_CLASS}>
        {content}
      </Link>
    );
  }
  if (props.kind === 'anchor') {
    return (
      <a href={props.href} className={ACTION_CLASS}>
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={props.isPressed}
      disabled={props.isDisabled ?? false}
      onClick={props.onPress}
      className={ACTION_CLASS}
    >
      {content}
    </button>
  );
}
