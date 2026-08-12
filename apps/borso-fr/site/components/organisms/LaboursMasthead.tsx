import { useTranslation } from 'react-i18next';
import { selectYearButtonColors } from '../../labours/labours-appearance.core';

const YEAR_BUTTON_CLASS_NAME =
  'm-0 inline-flex min-h-11 min-w-11 cursor-pointer appearance-none items-center justify-center border border-labours-ink px-3.5 py-2 font-labours-sans text-[12px] font-medium tracking-[0.08em]';

interface LaboursMastheadProps {
  availableYears: readonly number[];
  selectedYear: number;
  onYearSelected: (year: number) => void;
}

// @FollowsBlueprint organism-presentational
export function LaboursMasthead({
  availableYears,
  selectedYear,
  onYearSelected,
}: LaboursMastheadProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center justify-between border-b border-labours-rule pb-3.5">
        <a
          className="inline-flex min-h-11 min-w-11 items-center border-b border-labours-ink pb-px font-labours-sans text-[12px] font-semibold tracking-[0.18em] text-labours-ink uppercase"
          href="/"
        >
          {t('common.brand.name')}
          <span className="text-labours-accent">.</span>
          {t('common.brand.domain')}
        </a>
        <div className="flex">
          {availableYears.map((candidateYear) => {
            const colors = selectYearButtonColors(candidateYear === selectedYear);
            return (
              <button
                type="button"
                key={candidateYear}
                onClick={() => {
                  onYearSelected(candidateYear);
                }}
                className={YEAR_BUTTON_CLASS_NAME}
                style={{ background: colors.background, color: colors.color }}
              >
                {candidateYear}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 items-end gap-8 border-b border-labours-rule pt-12 pb-7 labours-stack:grid-cols-[1.4fr_1fr]">
        <h1 className="m-0 font-labours-serif text-[96px] leading-[0.85] font-normal tracking-[-0.035em] text-labours-ink italic labours-display:text-[148px]">
          {t('twelve-labours.title.first-line')}
          <br />
          {t('twelve-labours.title.second-line')}
          <span className="text-labours-accent not-italic">.</span>
        </h1>
        <div className="max-w-[380px] justify-self-end pb-2.5 text-right">
          <div className="mb-2.5 font-labours-sans text-[11px] font-semibold tracking-[0.22em] text-labours-accent uppercase">
            {t('twelve-labours.project.label')}
          </div>
          <div className="font-labours-serif text-[20px] leading-[1.3] text-labours-ink italic">
            {t('twelve-labours.project.description')}
          </div>
        </div>
      </div>
    </>
  );
}
