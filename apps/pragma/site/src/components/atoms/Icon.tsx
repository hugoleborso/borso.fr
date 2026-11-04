import type { SVGProps } from 'react';
import { composeClassName } from './class-name.utils';
import { INSTRUMENT_GLYPHS } from './InstrumentGlyphs';
import { INTERFACE_GLYPHS } from './InterfaceGlyphs';

const ICONS = {
  ...INTERFACE_GLYPHS,
  ...INSTRUMENT_GLYPHS,
} as const;

export type IconName = keyof typeof ICONS;

export type IconSize = 'sm' | 'md' | 'lg';

const ICON_PIXELS: Readonly<Record<IconSize, number>> = { sm: 16, md: 20, lg: 24 };

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: IconSize;
}

/**
 * @Blueprint atom-icon-registry
 * @BlueprintName Atom Backed By An Icon Registry
 * @BlueprintUsage Use for the single icon atom of an application, so every glyph the interface draws has one home.
 * @BlueprintDescription Keeps every glyph in one `as const` map of SVG bodies and derives the `IconName` union from `keyof typeof ICONS`, so an unknown name is a type error and adding a glyph is one entry rather than a new component. The atom owns the viewBox, the stroke settings and the size, so a caller passes a name instead of markup.
 */
export function Icon({ name, size = 'sm', className, ...rest }: IconProps): JSX.Element {
  return (
    <svg
      width={ICON_PIXELS[size]}
      height={ICON_PIXELS[size]}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={composeClassName('inline-block shrink-0', className)}
      aria-hidden="true"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
