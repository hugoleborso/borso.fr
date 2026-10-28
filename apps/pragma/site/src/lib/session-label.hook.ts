import { useTranslation } from 'react-i18next';
import { formatSessionDate } from './formatters.utils';
import { composeSessionLabel } from './session-label.utils';

export interface LabelledSession {
  readonly kind: string;
  readonly date: string;
  readonly venue: string | null;
}

const SESSION_KIND_KEY = {
  concert: 'sessions.kindConcert',
  practice: 'sessions.kindPractice',
} as const;

function kindKeyOf(kind: string): (typeof SESSION_KIND_KEY)[keyof typeof SESSION_KIND_KEY] {
  return kind === 'concert' ? SESSION_KIND_KEY.concert : SESSION_KIND_KEY.practice;
}

// @FollowsBlueprint hook-stateful-helper
export function useSessionLabel(): (session: LabelledSession) => string {
  const { t, i18n } = useTranslation();
  return (session) =>
    composeSessionLabel({
      kindLabel: t(kindKeyOf(session.kind)),
      dateLabel: formatSessionDate(session.date, i18n.language),
      venue: session.venue,
    });
}
