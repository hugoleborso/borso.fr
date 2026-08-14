/**
 * Textarea that grows to the height of what it holds, so the page is the only
 * thing that scrolls. A fixed row count shows a few lines of a longer note
 * through a nested scroll region, and the drag that would reach the rest moves
 * the box instead of the page — iOS Safari draws no resize grabber, so on a
 * phone there is no way to make the box taller.
 *
 * `rows` still sets the floor: `scrollHeight` never reports less than the box
 * the row count reserves, so an empty field keeps the height it was given.
 */

import type { JSX, TextareaHTMLAttributes } from 'react';
import { composeClassName } from './class-name.utils';
import { type InputVariantProps, inputVariants } from './input.variants';

export interface AutoGrowTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>, InputVariantProps {}

function fitToContent(element: HTMLTextAreaElement | null): void {
  if (element === null) return;
  element.style.setProperty('height', 'auto');
  element.style.setProperty('height', `${element.scrollHeight}px`);
}

// @FollowsBlueprint atom-variant
export function AutoGrowTextarea({
  className,
  size,
  onChange,
  ...rest
}: AutoGrowTextareaProps): JSX.Element {
  return (
    <textarea
      ref={fitToContent}
      onChange={(event) => {
        onChange?.(event);
        fitToContent(event.currentTarget);
      }}
      className={composeClassName(
        inputVariants({ size }),
        'resize-none overflow-hidden',
        className,
      )}
      {...rest}
    />
  );
}
