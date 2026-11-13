const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2 rounded-md ' +
  'text-base font-bold leading-tight text-center ' +
  'transition-[background-color,color,transform] duration-150 ease-out-quick active:scale-[0.98] ' +
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';

export const BUTTON_CLASS =
  BUTTON_BASE + ' border-2 border-ink bg-transparent text-ink hover:bg-surface';

export const ACTIVE_BUTTON_CLASS =
  BUTTON_BASE + ' border-2 border-primary bg-primary text-on-primary hover:opacity-90';

export const QUIET_BUTTON_CLASS =
  BUTTON_BASE +
  ' px-2 border-2 border-transparent bg-transparent text-ink whitespace-nowrap ' +
  'underline underline-offset-4 decoration-2 hover:decoration-accent';
