/**
 * Button atom — every clickable surface in the UI. Composition with the
 * Icon atom is done at the call site, so there is no built-in icon prop.
 */

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { type ButtonVariantProps, buttonVariants } from './button.variants';
import { cn } from './cn.utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {}

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
