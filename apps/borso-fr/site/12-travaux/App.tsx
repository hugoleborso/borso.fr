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
import { INK, MUTED, PAPER, RULE, SANS_FAMILY } from '../theme/twelve-labours.theme';

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
    <div
      className="twelve-travaux-page"
      style={{
        width: '100%',
        minHeight: '100%',
        background: PAPER,
        color: INK,
        fontFamily: SANS_FAMILY,
        boxSizing: 'border-box',
      }}
    >
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

      <div
        style={{
          marginTop: 36,
          paddingTop: 14,
          borderTop: `1px solid ${RULE}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: SANS_FAMILY,
          fontSize: 11,
          color: MUTED,
          letterSpacing: '0.06em',
        }}
      >
        <span>{t('twelve-labours.footer.credit')}</span>
      </div>
    </div>
  );
}
