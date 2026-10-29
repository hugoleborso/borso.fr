import { useTranslation } from 'react-i18next';
import { browserStorage } from '../../i18n/i18n.setup';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../i18n/i18n.utils';
import { writePersistedLocale } from '../../i18n/locale-storage.utils';
import { Chip } from '../atoms/Chip';

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
    <div className="flex items-center gap-1.5">
      {SUPPORTED_LOCALES.map((locale) => (
        <Chip
          key={locale}
          pressed={locale === activeLocale}
          onPress={() => selectLocale(locale)}
          className="min-w-11 justify-center uppercase"
        >
          {t(LOCALE_LABEL_KEY[locale])}
        </Chip>
      ))}
    </div>
  );
}
