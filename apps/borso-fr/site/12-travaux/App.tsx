import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FeaturedMonth } from '../components/organisms/FeaturedMonth';
import { LaboursHero } from '../components/organisms/LaboursHero';
import { LaboursMasthead } from '../components/organisms/LaboursMasthead';
import { MonthFilmstrip } from '../components/organisms/MonthFilmstrip';
import {
  listAvailableYears,
  selectCurrentMonthNumber,
  selectDefaultMonthNumber,
  selectDefaultYear,
  selectEdition,
  selectFeaturedMonth,
} from '../labours/labours.core';
import { LABOURS } from '../labours/labours';

const TODAY = new Date();

const AVAILABLE_YEARS = listAvailableYears(LABOURS);

const DEFAULT_YEAR = selectDefaultYear(AVAILABLE_YEARS, TODAY.getFullYear());

export function App() {
  const { t } = useTranslation();
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(() =>
    selectDefaultMonthNumber(DEFAULT_YEAR, TODAY),
  );

  const edition = selectEdition(LABOURS, year);
  const featuredMonth = selectFeaturedMonth(edition, selectedMonthNumber);

  return (
    <div className="min-h-full w-full bg-labours-paper px-5 pt-6 pb-8 font-labours-sans text-labours-ink labours-stack:px-12 labours-stack:pt-9 labours-stack:pb-12">
      <LaboursMasthead
        availableYears={AVAILABLE_YEARS}
        selectedYear={year}
        onYearSelected={(nextYear) => {
          setYear(nextYear);
          setSelectedMonthNumber(selectDefaultMonthNumber(nextYear, TODAY));
        }}
      />

      <LaboursHero edition={edition} year={year} />

      <FeaturedMonth month={featuredMonth} year={year} />

      <MonthFilmstrip
        edition={edition}
        selectedMonthNumber={selectedMonthNumber}
        currentMonthNumber={selectCurrentMonthNumber(year, TODAY)}
        onMonthSelected={setSelectedMonthNumber}
      />

      <div className="mt-9 flex justify-between border-t border-labours-rule pt-3.5 font-labours-sans text-[11px] tracking-[0.06em] text-labours-muted">
        <span>{t('twelve-labours.footer.credit')}</span>
      </div>
    </div>
  );
}
