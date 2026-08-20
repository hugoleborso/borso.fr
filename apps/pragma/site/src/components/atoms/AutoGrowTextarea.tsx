import type { JSX, TextareaHTMLAttributes } from 'react';
import { measureAutoGrowBox } from './auto-grow-textarea.utils';
import { composeClassName } from './class-name.utils';
import { type InputVariantProps, inputVariants } from './input.variants';

export interface AutoGrowTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>, InputVariantProps {}

function fitToContent(element: HTMLTextAreaElement | null): void {
  if (element === null) return;
  element.style.setProperty('height', 'auto');
  const box = measureAutoGrowBox(element.scrollHeight, window.innerHeight);
  element.style.setProperty('height', `${box.heightPx}px`);
  element.style.setProperty('overflow-y', box.overflowY);
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
        'resize-none overflow-x-hidden',
        className,
      )}
      {...rest}
    />
  );
}
