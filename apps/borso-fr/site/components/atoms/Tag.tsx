import { SANS_FAMILY } from '../../theme/twelve-labours.theme';

export type TagSize = 'regular' | 'large';

interface TagSizing {
  fontSize: number;
  padding: string;
}

const SIZING_BY_SIZE: Readonly<Record<TagSize, TagSizing>> = {
  regular: { fontSize: 10, padding: '3px 7px' },
  large: { fontSize: 12, padding: '5px 10px' },
};

interface TagProps {
  label: string;
  foreground: string;
  background: string;
  borderColor: string;
  size: TagSize;
}

// @FollowsBlueprint atom-plain
export function Tag({ label, foreground, background, borderColor, size }: TagProps) {
  const sizing = SIZING_BY_SIZE[size];
  return (
    <span
      style={{
        fontFamily: SANS_FAMILY,
        fontWeight: 500,
        fontSize: sizing.fontSize,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        padding: sizing.padding,
        background,
        color: foreground,
        border: `1px solid ${borderColor}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {label}
    </span>
  );
}
