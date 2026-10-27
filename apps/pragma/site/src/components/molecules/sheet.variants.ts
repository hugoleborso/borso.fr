import { cva, type VariantProps } from 'class-variance-authority';

// @FollowsBlueprint atom-variant
export const sheetVariants = cva(
  'm-0 mt-auto mx-auto w-full max-w-full sm:max-w-[34rem] flex-col overflow-hidden border-0 p-0 ' +
    'rounded-t-sheet bg-raised text-ink shadow-overlay open:flex backdrop:bg-scrim',
  {
    variants: {
      size: {
        sheet: 'max-h-[92dvh]',
        full: 'h-[92dvh] max-h-[92dvh]',
        confirm: 'max-h-[60dvh]',
      },
    },
    defaultVariants: { size: 'sheet' },
  },
);

export type SheetVariantProps = VariantProps<typeof sheetVariants>;

export const SHEET_BODY_CLASS = 'min-h-0 flex-auto overflow-y-auto overscroll-contain px-4 pb-4';
