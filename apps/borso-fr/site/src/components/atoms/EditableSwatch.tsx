import clsx from 'clsx';
import { SWATCH_CLASS_NAME } from './ReadOnlySwatch';

const PENCIL_ON_HOVER =
  "hover:before:absolute hover:before:inset-0 hover:before:flex hover:before:items-center hover:before:justify-center hover:before:bg-black/[0.18] hover:before:text-[16px] hover:before:text-white hover:before:[text-shadow:0_1px_3px_rgba(0,0,0,0.6)] hover:before:content-['✎']";

/**
 * With no pointer to hover, the pencil and the label are both shown at once
 * rather than one at a time, which is also why the row's gap widens there: a
 * label such as `Couleur 1` is 56px wide on a 44px swatch and has to clear its
 * neighbours.
 */
const PENCIL_ON_TOUCH =
  "[@media(hover:none)]:after:absolute [@media(hover:none)]:after:inset-0 [@media(hover:none)]:after:flex [@media(hover:none)]:after:items-center [@media(hover:none)]:after:justify-center [@media(hover:none)]:after:bg-black/[0.18] [@media(hover:none)]:after:text-[16px] [@media(hover:none)]:after:text-white [@media(hover:none)]:after:[text-shadow:0_1px_3px_rgba(0,0,0,0.6)] [@media(hover:none)]:after:content-['✎']";

/**
 * The label is wider than the swatch it names, so it is centred on the swatch
 * and sized to its content rather than clipped to the swatch's box.
 */
const SWATCH_NAME_CLASS_NAME =
  'absolute -bottom-[18px] left-1/2 w-max -translate-x-1/2 text-center font-atelier-mono text-[8px] tracking-[0.18em] whitespace-nowrap text-atelier-ink-soft uppercase opacity-0 transition-opacity duration-[160ms] group-hover:opacity-70 [@media(hover:none)]:opacity-70';

interface EditableSwatchProps {
  color: string;
  name: string;
  title: string;
  editLabel: string;
  onColorChange: (nextHex: string) => void;
}

// @FollowsBlueprint atom-plain
export function EditableSwatch({
  color,
  name,
  title,
  editLabel,
  onColorChange,
}: EditableSwatchProps) {
  return (
    <label
      className={clsx('group', SWATCH_CLASS_NAME, PENCIL_ON_HOVER, PENCIL_ON_TOUCH)}
      style={{ background: color }}
      title={title}
    >
      <span className={SWATCH_NAME_CLASS_NAME}>{name}</span>
      <input
        className="absolute inset-0 h-full w-full cursor-pointer border-none p-0 opacity-0"
        type="color"
        value={color}
        onChange={(event) => onColorChange(event.target.value)}
        aria-label={editLabel}
      />
    </label>
  );
}
