import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n/i18n';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n/i18n.utils';
import { Select } from '../atoms/Select';

const LABEL_KEY_BY_LANGUAGE = {
  fr: 'nav.language-french',
  en: 'nav.language-english',
} as const;

const SELECT_ID = 'language-switcher';

function readSelectedLanguage(value: string): SupportedLanguage {
  return SUPPORTED_LANGUAGES.find((language) => language === value) ?? 'fr';
}

// @FollowsBlueprint molecule-presentational
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  return (
    <label className="inline-flex items-center" htmlFor={SELECT_ID}>
      <span className="sr-only">{t('nav.language')}</span>
      <Select
        id={SELECT_ID}
        value={readSelectedLanguage(i18n.language)}
        options={SUPPORTED_LANGUAGES.map((language) => ({
          value: language,
          label: t(LABEL_KEY_BY_LANGUAGE[language]),
        }))}
        onSelect={(value) => {
          changeLanguage(readSelectedLanguage(value));
        }}
      />
    </label>
  );
}
