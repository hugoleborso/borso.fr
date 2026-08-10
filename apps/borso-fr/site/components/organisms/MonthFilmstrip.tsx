import { useTranslation } from 'react-i18next';
import type { Edition } from '../../labours/labours.types';
import { INK, MUTED, SANS_FAMILY } from '../../theme/twelve-labours.theme';
import { FilmstripCard } from '../molecules/FilmstripCard';

const FILMSTRIP_MINIMUM_HEIGHT_PX = 200;

interface MonthFilmstripProps {
  edition: Edition;
  selectedMonthNumber: number;
  currentMonthNumber: number | null;
  onMonthSelected: (monthNumber: number) => void;
}

// @FollowsBlueprint organism-presentational
export function MonthFilmstrip({
  edition,
  selectedMonthNumber,
  currentMonthNumber,
  onMonthSelected,
}: MonthFilmstripProps) {
  const { t } = useTranslation();
  return (
    <div style={{ marginTop: 32 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FAMILY,
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: INK,
          }}
        >
          {t('twelve-labours.filmstrip.heading')}
        </div>
        <div
          style={{
            fontFamily: SANS_FAMILY,
            fontSize: 11,
            color: MUTED,
            letterSpacing: '0.04em',
          }}
        >
          {t('twelve-labours.filmstrip.hint')}
        </div>
      </div>
      <div
        className="twelve-travaux-filmstrip"
        style={{ gap: 8, minHeight: FILMSTRIP_MINIMUM_HEIGHT_PX }}
      >
        {edition.months.map((month) => (
          <FilmstripCard
            key={month.monthNumber}
            month={month}
            isActive={selectedMonthNumber === month.monthNumber}
            isCurrentMonth={currentMonthNumber === month.monthNumber}
            onSelect={() => {
              onMonthSelected(month.monthNumber);
            }}
          />
        ))}
      </div>
    </div>
  );
}
