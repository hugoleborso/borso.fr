import { useTranslation } from 'react-i18next';
import { ExternalLink } from '@/components/atoms/ExternalLink';
import type { Idea } from '@/decks/deck.utils';
import { selectIdeaText } from '@/decks/idea.utils';

interface IdeaPanelProps {
  idea: Idea | null;
}

// @FollowsBlueprint molecule-presentational
export function IdeaPanel({ idea }: IdeaPanelProps) {
  const { t, i18n } = useTranslation();
  const text = idea === null ? t('review.idea.missing') : selectIdeaText(idea, i18n.language);
  const sourceUrl = idea?.sourceUrl;
  return (
    <section className="flex flex-col gap-1.5" aria-label={t('review.idea.title')}>
      <h3 className="text-sm font-bold uppercase tracking-[0.06em] text-ink-muted">
        {t('review.idea.title')}
      </h3>
      <p className="max-w-[65ch] text-[1.0625rem] leading-relaxed whitespace-pre-line">{text}</p>
      {sourceUrl === undefined ? null : (
        <ExternalLink href={sourceUrl} label={t('review.idea.wikipedia-credit')} />
      )}
    </section>
  );
}
