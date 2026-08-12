import { useTranslation } from 'react-i18next';
import type { Edition } from '../../labours/labours.types';
import { FilmstripCard } from '../molecules/FilmstripCard';

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
    <div className="mt-8">
      <div className="mb-3.5 flex items-baseline justify-between">
        <div className="font-labours-sans text-[11px] font-semibold tracking-[0.22em] text-labours-ink uppercase">
          {t('twelve-labours.filmstrip.heading')}
        </div>
        <div className="font-labours-sans text-[11px] tracking-[0.04em] text-labours-muted">
          {t('twelve-labours.filmstrip.hint')}
        </div>
      </div>
      <div className="grid min-h-[200px] grid-cols-[repeat(12,minmax(160px,1fr))] gap-2 overflow-x-auto pb-2 labours-stack:grid-cols-12 labours-stack:overflow-x-visible labours-stack:pb-0">
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
