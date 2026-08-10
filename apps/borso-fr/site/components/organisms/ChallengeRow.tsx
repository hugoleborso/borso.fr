import { useTranslation } from 'react-i18next';
import { NO_BORDER, selectKindLabelKey } from '../../labours/labours-appearance.core';
import { listChallengeNoteKeys, listProofSections } from '../../labours/labours.core';
import type { Challenge } from '../../labours/labours.types';
import {
  ACCENT,
  DASH_RULE,
  INK,
  MUTED,
  NOTE_INK,
  SANS_FAMILY,
  SERIF_FAMILY,
} from '../../theme/twelve-labours.theme';
import { ChallengeStatusTag } from '../molecules/ChallengeStatusTag';
import { ProofSection } from './ProofSection';

const META_ROW_MARGIN_BOTTOM_PX: Readonly<Record<`${boolean}`, number>> = { true: 10, false: 0 };
const ROW_BORDER_BOTTOM: Readonly<Record<`${boolean}`, string>> = {
  true: NO_BORDER,
  false: `1px dashed ${DASH_RULE}`,
};

interface ChallengeRowProps {
  challenge: Challenge;
  position: number;
  isLastRow: boolean;
}

// @FollowsBlueprint organism-presentational
export function ChallengeRow({ challenge, position, isLastRow }: ChallengeRowProps) {
  const { t } = useTranslation();
  const noteKeys = listChallengeNoteKeys(challenge);
  const hasNote = noteKeys.length > 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px minmax(0, 1fr)',
        gap: 20,
        paddingBottom: 20,
        borderBottom: ROW_BORDER_BOTTOM[`${isLastRow}`],
      }}
    >
      <div
        style={{
          fontFamily: SERIF_FAMILY,
          fontSize: 32,
          color: ACCENT,
          lineHeight: 1,
          fontStyle: 'italic',
        }}
      >
        {position}.
      </div>
      <div>
        <div
          style={{
            fontFamily: SERIF_FAMILY,
            fontSize: 26,
            lineHeight: 1.15,
            color: INK,
            marginBottom: 8,
            letterSpacing: '-0.01em',
          }}
        >
          {t(challenge.titleKey)}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: META_ROW_MARGIN_BOTTOM_PX[`${hasNote}`],
          }}
        >
          <ChallengeStatusTag status={challenge.status} size="regular" />
          <span
            style={{
              fontFamily: SANS_FAMILY,
              fontSize: 11,
              color: MUTED,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {t(selectKindLabelKey(challenge.kind))}
          </span>
        </div>
        {noteKeys.map((noteKey) => (
          <div
            key={noteKey}
            style={{
              fontFamily: SERIF_FAMILY,
              fontStyle: 'italic',
              fontSize: 17,
              color: NOTE_INK,
              lineHeight: 1.4,
              marginBottom: 10,
            }}
          >
            {t('twelve-labours.featured.note', { note: t(noteKey) })}
          </div>
        ))}
        {listProofSections(challenge).map((section) => (
          <ProofSection
            key={section.kind}
            challenge={challenge}
            kind={section.kind}
            proofs={section.proofs}
          />
        ))}
      </div>
    </div>
  );
}
