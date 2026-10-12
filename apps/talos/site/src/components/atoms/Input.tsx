import { forwardRef, type InputHTMLAttributes } from 'react';
import { composeClassName } from './class-name.utils';
import { fieldVariants } from './field.variants';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

// @FollowsBlueprint atom-plain
export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...rest }, ref) => (
  <input
    ref={ref}
    className={composeClassName(fieldVariants({ shape: 'line' }), className)}
    {...rest}
  />
));
Input.displayName = 'Input';
