/**
 * LanguageSwitcher — two pill-shaped buttons (FR / EN) sitting at the
 * bottom of the AppShell sidebar. Clicking a pill swaps i18next's
 * active language and persists the choice to localStorage under
 * `pragma.locale` so a refresh sticks. The active pill carries the
 * accent border + accent text; the inactive one is the muted ink-500.
 */

import { useTranslation } from 'react-i18next';
import { browserStorage } from '../../i18n/i18n.setup';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../i18n/i18n.utils';
import { writePersistedLocale } from '../../i18n/locale-storage.utils';
import { composeClassName } from '../atoms/class-name.utils';

const LOCALE_LABEL_KEY = {
  fr: 'nav.language.fr',
  en: 'nav.language.en',
} as const satisfies Readonly<Record<SupportedLocale, string>>;

// @FollowsBlueprint molecule-presentational
export function LanguageSwitcher(): JSX.Element {
  const { t, i18n } = useTranslation();
  const activeLocale = SUPPORTED_LOCALES.find((locale) => locale === i18n.language) ?? 'fr';

  const selectLocale = (locale: SupportedLocale): void => {
    if (locale === activeLocale) return;
    void i18n.changeLanguage(locale);
    writePersistedLocale(browserStorage(), locale);
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5">
      {SUPPORTED_LOCALES.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => selectLocale(locale)}
            aria-pressed={isActive}
            className={composeClassName(
              'inline-flex items-center justify-center min-w-11 min-h-11 px-3 rounded-full text-xs font-medium uppercase tracking-[0.08em] border transition-colors cursor-pointer',
              isActive
                ? 'border-accent text-accent bg-bg-elev'
                : 'border-line text-ink-500 hover:text-ink-700 hover:border-line-strong',
            )}
          >
            {t(LOCALE_LABEL_KEY[locale])}
          </button>
        );
      })}
    </div>
  );
}
