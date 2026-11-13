import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/atoms/Button';
import { ExternalLink } from '@/components/atoms/ExternalLink';
import { Modal } from '@/components/atoms/Modal';
import type { Idea } from '@/decks/deck.utils';
import { selectIdeaText } from '@/decks/idea.utils';

interface IdeaPanelProps {
  idea: Idea | null;
}

const IDEA_TEXT_CLASS = 'max-w-[65ch] text-[1.0625rem] leading-relaxed whitespace-pre-line';

const IDEA_PREVIEW_CLASS =
  'max-w-[65ch] text-[1.0625rem] leading-relaxed whitespace-pre-line line-clamp-2 roomy:line-clamp-none';

type IdeaCreditLength = 'short' | 'full';

const CREDIT_KEY_BY_LENGTH = {
  short: 'review.idea.wikipedia-credit-short',
  full: 'review.idea.wikipedia-credit',
} as const satisfies Record<IdeaCreditLength, string>;

interface IdeaCreditProps {
  sourceUrl: string | undefined;
  length: IdeaCreditLength;
}

function IdeaCredit({ sourceUrl, length }: IdeaCreditProps) {
  const { t } = useTranslation();
  if (sourceUrl === undefined) return null;
  return <ExternalLink href={sourceUrl} label={t(CREDIT_KEY_BY_LENGTH[length])} />;
}

// @FollowsBlueprint molecule-presentational
export function IdeaPanel({ idea }: IdeaPanelProps) {
  const { t, i18n } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const text = idea === null ? t('review.idea.missing') : selectIdeaText(idea, i18n.language);
  const sourceUrl = idea?.sourceUrl;
  return (
    <section className="flex flex-col gap-1.5" aria-label={t('review.idea.title')}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.06em] text-ink-muted">
          {t('review.idea.title')}
        </h3>
        <div className="flex items-center gap-2 -my-3.5 roomy:hidden">
          <IdeaCredit sourceUrl={sourceUrl} length="short" />
          <Button
            label={t('review.idea.read-all')}
            variant="quiet"
            onActivate={() => setIsSheetOpen(true)}
          />
        </div>
      </div>
      <p className={IDEA_PREVIEW_CLASS}>{text}</p>
      <div className="hidden roomy:block">
        <IdeaCredit sourceUrl={sourceUrl} length="full" />
      </div>
      {isSheetOpen ? (
        <Modal
          title={t('review.idea.title')}
          closeLabel={t('review.idea.close')}
          onClose={() => setIsSheetOpen(false)}
        >
          <p className={IDEA_TEXT_CLASS}>{text}</p>
          <IdeaCredit sourceUrl={sourceUrl} length="full" />
        </Modal>
      ) : null}
    </section>
  );
}
