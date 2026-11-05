import type { JSX, TextareaHTMLAttributes } from 'react';
import { composeClassName } from './class-name.utils';
import { type InputVariantProps, inputVariants } from './input.variants';

export interface AutoGrowTextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>, InputVariantProps {}

function fitToContent(element: HTMLTextAreaElement): void {
  element.style.setProperty('height', 'auto');
  const borderHeight = element.offsetHeight - element.clientHeight;
  element.style.setProperty('height', `${String(element.scrollHeight + borderHeight)}px`);
}

function fitNowAndOnceFontsLoad(element: HTMLTextAreaElement | null): void {
  if (element === null) return;
  fitToContent(element);
  if (!('fonts' in element.ownerDocument)) return;
  void element.ownerDocument.fonts.ready.then(() => {
    fitToContent(element);
  });
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
      ref={fitNowAndOnceFontsLoad}
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
