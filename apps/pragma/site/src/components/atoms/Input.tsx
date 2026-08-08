/**
 * Input atom — text inputs, search fields, and selects share the same
 * paper-elevated style.
 */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { composeClassName } from './class-name.utils';
import { type InputVariantProps, inputVariants } from './input.variants';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, InputVariantProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, ...rest }, ref) => (
    <input ref={ref} className={composeClassName(inputVariants({ size }), className)} {...rest} />
  ),
);
Input.displayName = 'Input';
