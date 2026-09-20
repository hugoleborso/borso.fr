import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { switchLocale } from '@site/i18n/i18n.setup';
import { SUPPORTED_LOCALES } from '@site/i18n/i18n.utils';
import { LANGUAGE_KEYS } from '@site/lib/translation-keys.core';
import { BananaIcon } from '../atoms/BananaIcon';

export interface AppShellProps {
  readonly children: ReactNode;
}

// @FollowsBlueprint organism-shell
export function AppShell({ children }: AppShellProps) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-cream pb-[env(safe-area-inset-bottom)]">
      <header className="mx-auto flex w-full max-w-lg shrink-0 items-center justify-between gap-2 px-4 pt-3">
        <a href="/" className="flex items-center gap-1.5 text-lg font-black">
          <BananaIcon className="h-6 w-6" />
          {t('appName')}
        </a>
        <nav aria-label={t('language.switch')} className="flex gap-1">
          {SUPPORTED_LOCALES.map((locale) => {
            const isCurrent = i18n.language.startsWith(locale);
            return (
              <button
                key={locale}
                type="button"
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => {
                  void switchLocale(locale);
                }}
                className={clsx(
                  'min-h-11 rounded-pill border-2 border-ink px-3 text-xs font-extrabold',
                  isCurrent ? 'bg-peel' : 'bg-cream',
                )}
              >
                {t(LANGUAGE_KEYS[locale])}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-4 pb-3 pt-3">
        {children}
      </main>
    </div>
  );
}
