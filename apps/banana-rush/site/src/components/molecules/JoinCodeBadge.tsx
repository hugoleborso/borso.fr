import { useTranslation } from 'react-i18next';
import { BananaIcon } from '../atoms/BananaIcon';

export interface JoinCodeBadgeProps {
  readonly joinCode: string;
}

// @FollowsBlueprint molecule-presentational
export function JoinCodeBadge({ joinCode }: JoinCodeBadgeProps) {
  const { t } = useTranslation();
  return (
    <section className="shrink-0 rounded-chunk border-[3px] border-ink bg-peel px-3 py-2 text-center shadow-chunk">
      <p className="text-[0.625rem] font-extrabold uppercase tracking-widest text-ink-soft">
        {t('lobby.codeLabel')}
      </p>
      <p className="flex items-center justify-center gap-2">
        <BananaIcon className="h-6 w-6" />
        <span className="text-4xl font-black tracking-[0.2em] tabular-nums">{joinCode}</span>
        <BananaIcon className="h-6 w-6 -scale-x-100" />
      </p>
    </section>
  );
}
