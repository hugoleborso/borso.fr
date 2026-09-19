import { useTranslation } from 'react-i18next';
import { BananaIcon } from '../atoms/BananaIcon';

export interface JoinCodeBadgeProps {
  readonly joinCode: string;
}

// @FollowsBlueprint molecule-presentational
export function JoinCodeBadge({ joinCode }: JoinCodeBadgeProps) {
  const { t } = useTranslation();
  return (
    <section className="rounded-chunk border-[3px] border-ink bg-peel px-4 py-4 text-center shadow-chunk">
      <p className="text-xs font-extrabold uppercase tracking-widest text-ink-soft">
        {t('lobby.codeLabel')}
      </p>
      <p className="mt-1 flex items-center justify-center gap-2">
        <BananaIcon className="h-7 w-7" />
        <span className="text-5xl font-black tracking-[0.2em] tabular-nums">{joinCode}</span>
        <BananaIcon className="h-7 w-7 -scale-x-100" />
      </p>
      <p className="mt-2 text-xs font-bold text-ink-soft">{t('lobby.shareHint')}</p>
    </section>
  );
}
