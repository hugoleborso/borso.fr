import { useTranslation } from 'react-i18next';
import { Select } from '@/components/atoms/Select';
import { setBoardStyle } from '@/state/appState';
import { type BoardThemeId, boardThemes, toBoardThemeId } from '@/theme/boardThemes.utils';

interface BoardStyleSelectProps {
  boardStyle: BoardThemeId;
}

// @FollowsBlueprint molecule-presentational
export function BoardStyleSelect({ boardStyle }: BoardStyleSelectProps) {
  const { t } = useTranslation();
  const label = t('top-bar.board-style.label');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span>{label}</span>
      <Select
        value={boardStyle}
        ariaLabel={label}
        options={boardThemes.map((theme) => ({ value: theme.id, label: t(theme.nameKey) }))}
        onSelect={(value) => setBoardStyle(toBoardThemeId(value, boardStyle))}
      />
    </div>
  );
}
