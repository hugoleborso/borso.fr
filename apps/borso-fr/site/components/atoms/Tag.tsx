import clsx from 'clsx';

export type TagSize = 'regular' | 'large';

const SIZING_BY_SIZE: Readonly<Record<TagSize, string>> = {
  regular: 'text-[10px] px-[7px] py-[3px]',
  large: 'text-[12px] px-2.5 py-[5px]',
};

const TAG_CLASS_NAME =
  'inline-flex items-center gap-1.5 border font-labours-sans font-medium tracking-[0.16em] uppercase';

interface TagProps {
  label: string;
  foreground: string;
  background: string;
  borderColor: string;
  size: TagSize;
}

// @FollowsBlueprint atom-plain
export function Tag({ label, foreground, background, borderColor, size }: TagProps) {
  return (
    <span
      className={clsx(TAG_CLASS_NAME, SIZING_BY_SIZE[size])}
      style={{ background, color: foreground, borderColor }}
    >
      {label}
    </span>
  );
}
