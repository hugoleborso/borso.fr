import { useTranslation } from 'react-i18next';
import { selectYearButtonColors } from '../../labours/labours-appearance.core';
import { ACCENT, INK, RULE, SANS_FAMILY, SERIF_FAMILY } from '../../theme/twelve-labours.theme';

const TOUCH_TARGET_MINIMUM_PX = 44;

interface LaboursMastheadProps {
  availableYears: readonly number[];
  selectedYear: number;
  onYearSelected: (year: number) => void;
}

export function LaboursMasthead({
  availableYears,
  selectedYear,
  onYearSelected,
}: LaboursMastheadProps) {
  const { t } = useTranslation();
  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 14,
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: SANS_FAMILY,
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: INK,
            textDecoration: 'none',
            borderBottom: `1px solid ${INK}`,
            paddingBottom: 1,
            display: 'inline-flex',
            alignItems: 'center',
            minWidth: TOUCH_TARGET_MINIMUM_PX,
            minHeight: TOUCH_TARGET_MINIMUM_PX,
          }}
        >
          borso<span style={{ color: ACCENT }}>.</span>fr
        </a>
        <div style={{ display: 'flex', gap: 0 }}>
          {availableYears.map((candidateYear) => {
            const colors = selectYearButtonColors(candidateYear === selectedYear);
            return (
              <button
                type="button"
                key={candidateYear}
                onClick={() => {
                  onYearSelected(candidateYear);
                }}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontFamily: SANS_FAMILY,
                  fontWeight: 500,
                  fontSize: 12,
                  padding: '8px 14px',
                  background: colors.background,
                  color: colors.color,
                  border: `1px solid ${INK}`,
                  letterSpacing: '0.08em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  minWidth: TOUCH_TARGET_MINIMUM_PX,
                  minHeight: TOUCH_TARGET_MINIMUM_PX,
                }}
              >
                {candidateYear}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="twelve-travaux-masthead-title"
        style={{
          padding: '48px 0 28px',
          borderBottom: `1px solid ${RULE}`,
          gap: 32,
          alignItems: 'end',
        }}
      >
        <h1
          className="twelve-travaux-title"
          style={{
            fontFamily: SERIF_FAMILY,
            fontWeight: 400,
            lineHeight: 0.85,
            margin: 0,
            letterSpacing: '-0.035em',
            color: INK,
            fontStyle: 'italic',
          }}
        >
          {t('twelve-labours.title.first-line')}
          <br />
          {t('twelve-labours.title.second-line')}
          <span style={{ color: ACCENT, fontStyle: 'normal' }}>.</span>
        </h1>
        <div style={{ textAlign: 'right', maxWidth: 380, paddingBottom: 10, justifySelf: 'end' }}>
          <div
            style={{
              fontFamily: SANS_FAMILY,
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: ACCENT,
              marginBottom: 10,
            }}
          >
            {t('twelve-labours.project.label')}
          </div>
          <div
            style={{
              fontFamily: SERIF_FAMILY,
              fontStyle: 'italic',
              fontSize: 20,
              lineHeight: 1.3,
              color: INK,
            }}
          >
            {t('twelve-labours.project.description')}
          </div>
        </div>
      </div>
    </>
  );
}
