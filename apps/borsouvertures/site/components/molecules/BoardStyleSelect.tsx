import { useTranslation } from 'react-i18next';
import { setBoardStyle } from '@/state/appState';
import { type BoardThemeId, boardThemes, toBoardThemeId } from '@/theme/boardThemes.utils';

interface BoardStyleSelectProps {
  boardStyle: BoardThemeId;
}

// @FollowsBlueprint molecule-presentational
export function BoardStyleSelect({ boardStyle }: BoardStyleSelectProps) {
  const { t } = useTranslation();
  return (
    <div className="controls-row">
      <span>{t('top-bar.board-style.label')}</span>
      <select
        className="select"
        aria-label={t('top-bar.board-style.label')}
        value={boardStyle}
        onChange={(event) => setBoardStyle(toBoardThemeId(event.target.value, boardStyle))}
      >
        {boardThemes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {t(theme.nameKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
