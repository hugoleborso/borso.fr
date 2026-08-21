import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { type ButtonVariantProps, buttonVariants } from './button.variants';
import { composeClassName } from './class-name.utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={composeClassName(buttonVariants({ variant, size }), className)}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';
