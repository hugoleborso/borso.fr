/**
 * Button atom — every clickable surface in the UI. Variants mirror
 * the prototype's `.btn`, `.btn.primary`, `.btn.accent`, `.btn.ghost`
 * with `sm` / `md` sizes. Composition with the Icon atom is done at
 * the call-site (no built-in `leftIcon` prop — atoms compose, they
 * don't reach for siblings).
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn.utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium ' +
    'transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent',
  {
    variants: {
      variant: {
        default:
          'bg-bg-elev border border-line-strong text-ink-900 hover:bg-bg',
        primary:
          'bg-ink-900 border border-ink-900 text-bg-elev hover:bg-ink-700',
        accent:
          'bg-accent border border-accent text-bg-elev hover:bg-accent-ink hover:border-accent-ink',
        ghost:
          'bg-transparent border border-transparent text-ink-900 hover:bg-[rgba(26,22,18,0.05)]',
        danger:
          'bg-danger border border-danger text-bg-elev hover:opacity-90',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-[13px]',
        lg: 'px-4 py-2 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';
