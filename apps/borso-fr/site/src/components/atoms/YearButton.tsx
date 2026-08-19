import { selectYearButtonColors } from '../../labours/labours-appearance.core';

const YEAR_BUTTON_CLASS_NAME =
  'm-0 inline-flex min-h-11 min-w-11 cursor-pointer appearance-none items-center justify-center border border-labours-ink px-3.5 py-2 font-labours-sans text-[12px] font-medium tracking-[0.08em]';

interface YearButtonProps {
  year: number;
  isSelected: boolean;
  onSelect: (year: number) => void;
}

// @FollowsBlueprint atom-plain
export function YearButton({ year, isSelected, onSelect }: YearButtonProps) {
  const colors = selectYearButtonColors(isSelected);
  return (
    <button
      type="button"
      onClick={() => {
        onSelect(year);
      }}
      className={YEAR_BUTTON_CLASS_NAME}
      style={{ background: colors.background, color: colors.color }}
    >
      {year}
    </button>
  );
}
