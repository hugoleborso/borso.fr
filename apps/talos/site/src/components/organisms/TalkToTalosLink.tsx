import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../atoms/Icon';
import { useTalkToTalosLink } from '../../lib/talk-to-talos.hook';

const TALK_ICON_SIZE = 20;

// @FollowsBlueprint organism-query-owning
export function TalkToTalosLink(): JSX.Element {
  const { t } = useTranslation();
  const link = useTalkToTalosLink();
  return (
    <a
      href={link.href}
      target={link.target}
      rel="noopener"
      aria-disabled={link.href === undefined}
      className="flex flex-col items-center justify-center min-h-11 h-full px-3 rounded-full bg-bronze text-on-bronze text-[10px] leading-[12px] font-semibold no-underline whitespace-nowrap active:bg-bronze-strong aria-disabled:opacity-60"
    >
      <span className="flex items-center justify-center h-6">
        <Icon name="talk" size={TALK_ICON_SIZE} strokeWidth={2} />
      </span>
      <span>{t('nav.talk')}</span>
    </a>
  );
}
