import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

const chunkyButton = cva(
  'inline-flex items-center justify-center gap-2 rounded-chunk border-[3px] border-ink font-extrabold tracking-tight transition-transform duration-75 active:translate-y-[3px] active:shadow-none disabled:translate-y-[3px] disabled:shadow-none disabled:opacity-50',
  {
    variants: {
      tone: {
        peel: 'bg-peel text-ink shadow-chunk',
        cream: 'bg-cream text-ink shadow-chunk',
        leaf: 'bg-leaf text-cream shadow-chunk',
        coral: 'bg-coral text-cream shadow-chunk',
      },
      size: {
        large: 'min-h-14 px-6 text-lg w-full',
        medium: 'min-h-12 px-5 text-base',
        small: 'min-h-10 px-3 text-sm',
      },
    },
    defaultVariants: { tone: 'peel', size: 'large' },
  },
);

export interface ChunkyButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof chunkyButton> {
  readonly children: ReactNode;
}

/**
 * @Blueprint atom-variant-table
 * @BlueprintName Atom With A Variant Table
 * @BlueprintUsage Use for a primitive whose appearance varies along a couple of closed axes, so callers pick a named variant rather than composing classes.
 * @BlueprintDescription Declares every appearance in one `cva` table, which makes the full set of variants readable in one place and makes an unnamed combination a type error at the call site rather than a class string nobody can grep for. The shared classes carry the press behaviour, so every button in the application falls the same three pixels when touched, and the disabled state reuses the pressed look rather than inventing a third one.
 */
export function ChunkyButton({ tone, size, className, children, ...rest }: ChunkyButtonProps) {
  return (
    <button type="button" className={chunkyButton({ tone, size, className })} {...rest}>
      {children}
    </button>
  );
}
