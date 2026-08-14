/**
 * The colours the twelve labours page picks at runtime, as references into the
 * `@theme` block in `site/styles/tokens.css`, so the hex is written once and a
 * value chosen in TypeScript and a value chosen by a Tailwind utility cannot
 * drift apart. Everything a component knows at build time is a utility class
 * on the element instead, which is why only the runtime palette is here.
 */
export const ACCENT = 'var(--color-labours-accent)';
export const INK = 'var(--color-labours-ink)';
export const PAPER = 'var(--color-labours-paper)';
export const MUTED = 'var(--color-labours-muted)';
export const DASH_RULE = 'var(--color-labours-dash-rule)';
export const STRIPE_LIGHT = 'var(--color-labours-stripe)';
export const WARNING_INK = 'var(--color-labours-warning-ink)';
export const FAILURE_INK = 'var(--color-labours-failure-ink)';
export const ACTIVE_INNER_RULE = 'var(--color-labours-active-rule)';

export const SUCCESS_BAR = 'var(--color-labours-success-bar)';
export const WARNING_BAR = 'var(--color-labours-warning-bar)';
export const FAILURE_BAR = 'var(--color-labours-failure-bar)';
export const ABANDONED_BAR_ON_DARK = 'var(--color-labours-abandoned-bar-dark)';
export const ABANDONED_BAR_ON_LIGHT = 'var(--color-labours-abandoned-bar-light)';
