import { STARTING_STASH_BANANAS } from '@domain/game-setup.core';
import { useTranslation } from 'react-i18next';
import { RULE_KEYS } from '@site/lib/translation-keys.core';
import { BananaIcon } from '../atoms/BananaIcon';

export interface RulesPanelProps {
  readonly winningScore: number;
}

// @FollowsBlueprint organism-presentational
export function RulesPanel({ winningScore }: RulesPanelProps) {
  const { t } = useTranslation();
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-chunk border-[3px] border-ink bg-cream px-3 py-3 shadow-chunk">
      <h2 className="shrink-0 text-lg font-black">{t('rules.title')}</h2>
      <ol className="mt-2 min-h-0 flex-1 space-y-1.5">
        {RULE_KEYS.map((key) => (
          <li key={key} className="flex gap-2 text-[0.8125rem] font-semibold leading-snug">
            <BananaIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t(key, { count: STARTING_STASH_BANANAS })}</span>
          </li>
        ))}
        <li className="flex gap-2 text-[0.8125rem] font-extrabold leading-snug">
          <BananaIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('rules.winning', { score: winningScore })}</span>
        </li>
      </ol>
    </section>
  );
}
