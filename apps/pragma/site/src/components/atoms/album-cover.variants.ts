import { cva, type VariantProps } from 'class-variance-authority';

export const albumCoverVariants = cva(
  'shrink-0 rounded-md object-cover bg-line inline-flex items-center justify-center ' +
    'font-sans font-semibold text-bg-elev uppercase tracking-wide',
  {
    variants: {
      size: {
        sm: 'w-10 h-10 text-xs',
        md: 'w-14 h-14 text-sm',
        lg: 'w-24 h-24 text-lg',
        xl: 'w-full aspect-square h-auto text-2xl rounded-xl',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

export type AlbumCoverVariantProps = VariantProps<typeof albumCoverVariants>;
