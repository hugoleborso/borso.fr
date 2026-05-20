/**
 * Input atom — text inputs, search fields, selects share the same
 * paper-elevated style. The variant + size table is intentionally
 * thin: components that need a leading icon (e.g. SearchBar) wrap
 * the Input themselves rather than adding an `icon` prop.
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn.utils';

export const inputVariants = cva(
  'w-full rounded-md bg-bg-elev border border-line text-ink-900 ' +
    'outline-none transition-colors focus:border-ink-700 placeholder:text-ink-400',
  {
    variants: {
      size: {
        sm: 'px-2.5 py-1.5 text-xs',
        md: 'px-3 py-2 text-[13px]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

type InputVariantProps = VariantProps<typeof inputVariants>;

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    InputVariantProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, ...rest }, ref) => (
    <input ref={ref} className={cn(inputVariants({ size }), className)} {...rest} />
  ),
);
Input.displayName = 'Input';
