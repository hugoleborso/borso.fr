import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { selectKindLabelKey } from '../../labours/labours-appearance.core';
import { listChallengeNoteKeys, listProofSections } from '../../labours/labours.core';
import type { Challenge } from '../../labours/labours.types';
import { ChallengeStatusTag } from '../molecules/ChallengeStatusTag';
import { ProofSection } from './ProofSection';

const ROW_CLASS_NAME = 'grid grid-cols-[28px_minmax(0,1fr)] gap-5 pb-5';
const META_ROW_CLASS_NAME = 'flex flex-wrap items-center gap-2.5';

const META_ROW_MARGIN: Readonly<Record<`${boolean}`, string>> = { true: 'mb-2.5', false: 'mb-0' };
const ROW_RULE: Readonly<Record<`${boolean}`, string>> = {
  true: 'border-b-0',
  false: 'border-b border-dashed border-labours-dash-rule',
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
    <div className={clsx(ROW_CLASS_NAME, ROW_RULE[`${isLastRow}`])}>
      <div className="font-labours-serif text-[32px] leading-none text-labours-accent italic">
        {position}.
      </div>
      <div>
        <div className="mb-2 font-labours-serif text-[26px] leading-[1.15] tracking-[-0.01em] text-labours-ink">
          {t(challenge.titleKey)}
        </div>
        <div className={clsx(META_ROW_CLASS_NAME, META_ROW_MARGIN[`${hasNote}`])}>
          <ChallengeStatusTag status={challenge.status} size="regular" />
          <span className="font-labours-sans text-[11px] tracking-[0.12em] text-labours-muted uppercase">
            {t(selectKindLabelKey(challenge.kind))}
          </span>
        </div>
        {noteKeys.map((noteKey) => (
          <div
            key={noteKey}
            className="mb-2.5 font-labours-serif text-[17px] leading-[1.4] text-labours-note-ink italic"
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
