import { cva, type VariantProps } from 'class-variance-authority';

export const albumCoverVariants = cva(
  'shrink-0 rounded-cover object-cover bg-rule inline-flex items-center justify-center shadow-cover ' +
    'font-sans font-semibold text-on-color-dark uppercase tracking-wide',
  {
    variants: {
      size: {
        sm: 'w-10 h-10 text-meta',
        md: 'w-14 h-14 text-meta',
        lg: 'w-24 h-24 text-title',
        xl: 'w-full aspect-square h-auto text-title rounded-lg',
      },
    },
    defaultVariants: { size: 'sm' },
  },
);

export type AlbumCoverVariantProps = VariantProps<typeof albumCoverVariants>;
