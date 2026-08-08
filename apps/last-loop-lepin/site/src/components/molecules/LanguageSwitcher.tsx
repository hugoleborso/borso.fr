import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n/i18n';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n/i18n.utils';

const LABEL_KEY_BY_LANGUAGE = {
  fr: 'nav.language-french',
  en: 'nav.language-english',
} as const;

const SELECT_ID = 'language-switcher';

function readSelectedLanguage(value: string): SupportedLanguage {
  return SUPPORTED_LANGUAGES.find((language) => language === value) ?? 'fr';
}

/** Interface language picker, which remembers the choice for the next visit. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <label className="language-switcher" htmlFor={SELECT_ID}>
      <span className="visually-hidden">{t('nav.language')}</span>
      <select
        id={SELECT_ID}
        value={readSelectedLanguage(i18n.language)}
        onChange={(event) => {
          changeLanguage(readSelectedLanguage(event.target.value));
        }}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {t(LABEL_KEY_BY_LANGUAGE[language])}
          </option>
        ))}
      </select>
    </label>
  );
}
