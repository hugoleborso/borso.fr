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
    <div className="min-h-dvh bg-cream">
      <header className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 pt-4">
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
      <main className="mx-auto max-w-lg px-4 pb-12 pt-4">{children}</main>
    </div>
  );
}
