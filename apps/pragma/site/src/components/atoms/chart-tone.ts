/**
 * Which palette a chord chart draws itself in. It lives in `atoms/` because
 * both the viewer organism and its section-heading molecule pick classes from
 * it, and the dependency arrow only ever runs atoms to molecules to organisms.
 *
 * `dark` is the stage view, read on black while playing; `light` is every
 * other surface.
 */
export type ChordChartTone = 'light' | 'dark';
