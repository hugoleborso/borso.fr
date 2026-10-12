import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { composeClassName } from './class-name.utils';
import { fieldVariants } from './field.variants';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

// @FollowsBlueprint atom-plain
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={composeClassName(fieldVariants({ shape: 'block' }), className)}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';
