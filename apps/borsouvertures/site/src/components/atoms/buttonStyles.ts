const BUTTON_BASE =
  'min-h-11 px-[0.9rem] py-2 rounded-[10px] border text-ink ' +
  'transition-[transform,background] duration-120 ease-[ease] hover:-translate-y-px ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';

export const BUTTON_CLASS = BUTTON_BASE + ' border-edge bg-raised hover:bg-raised-hover';

export const ACTIVE_BUTTON_CLASS =
  BUTTON_BASE + ' border-white/20 bg-[image:var(--gradient-accent)]';
