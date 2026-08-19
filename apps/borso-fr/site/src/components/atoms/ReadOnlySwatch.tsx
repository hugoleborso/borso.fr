export const SWATCH_CLASS_NAME =
  'relative inline-block h-8 w-8 min-h-11 min-w-11 cursor-pointer border border-atelier-rule-strong bg-white p-0 transition-[translate,box-shadow] duration-[160ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-0.5 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-atelier-ink atelier-roomy:h-[38px] atelier-roomy:w-[38px]';

interface ReadOnlySwatchProps {
  color: string;
  name: string;
}

// @FollowsBlueprint atom-plain
export function ReadOnlySwatch({ color, name }: ReadOnlySwatchProps) {
  return <span className={SWATCH_CLASS_NAME} style={{ background: color }} title={name} />;
}
