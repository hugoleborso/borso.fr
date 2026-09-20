import { useTranslation } from 'react-i18next';
import { BananaIcon } from '../atoms/BananaIcon';
import { RoundCountdown } from '../atoms/RoundCountdown';

export interface CrateCardProps {
  readonly crateBananas: number;
  readonly roundNumber: number;
  readonly winningScore: number;
  readonly secondsRemaining: number | null;
}

/**
 * @Blueprint molecule-headline-band
 * @BlueprintName Molecule Headline Band
 * @BlueprintUsage Use for the one figure a screen exists around, on a screen that has no room to spend on it.
 * @BlueprintDescription Puts the figure and everything qualifying it on one line rather than stacking a label above it and a caption below, and takes in the running clock rather than letting it claim a band of its own — a single line of text inside its own bordered pill costs three times the height of the same text set beside something already there. On a screen that cannot scroll, the height this gives back is the room the controls below it need, and the figure still reads first because it is the only thing set large. The qualifiers sit either side of it, so the band stays balanced whether the number is one digit or four.
 */
export function CrateCard({
  crateBananas,
  roundNumber,
  winningScore,
  secondsRemaining,
}: CrateCardProps) {
  const { t } = useTranslation();
  return (
    <section className="flex shrink-0 items-center justify-between gap-2 rounded-chunk border-[3px] border-ink bg-peel px-3 py-2 shadow-chunk">
      <span className="flex flex-col items-start gap-0.5">
        <span className="text-[0.625rem] font-extrabold uppercase leading-tight tracking-widest text-ink-soft">
          {t('game.round', { number: roundNumber })}
        </span>
        <RoundCountdown secondsRemaining={secondsRemaining} />
      </span>
      <span className="flex items-center gap-1.5">
        <BananaIcon className="h-7 w-7" />
        <span className="text-4xl font-black leading-none tabular-nums">{crateBananas}</span>
      </span>
      <span className="text-[0.625rem] font-extrabold uppercase leading-tight tracking-widest text-ink-soft">
        {t('game.target', { score: winningScore })}
      </span>
    </section>
  );
}
