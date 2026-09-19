import { useTranslation } from 'react-i18next';
import { BananaIcon } from '../atoms/BananaIcon';

export interface CrateCardProps {
  readonly crateBananas: number;
  readonly roundNumber: number;
  readonly winningScore: number;
}

// @FollowsBlueprint molecule-presentational
export function CrateCard({ crateBananas, roundNumber, winningScore }: CrateCardProps) {
  const { t } = useTranslation();
  return (
    <section className="rounded-chunk border-[3px] border-ink bg-peel px-4 py-4 text-center shadow-chunk">
      <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
        {t('game.round', { number: roundNumber })}
      </p>
      <p className="mt-1 text-sm font-extrabold uppercase tracking-wide">{t('game.crate')}</p>
      <p className="mt-1 flex items-center justify-center gap-2">
        <BananaIcon className="h-9 w-9" />
        <span className="text-5xl font-black tabular-nums leading-none">{crateBananas}</span>
      </p>
      <p className="mt-2 text-xs font-bold text-ink-soft">
        {t('game.target', { score: winningScore })}
      </p>
    </section>
  );
}
