import { useTranslation } from 'react-i18next';
import { ToggleSlider } from '@/components/atoms/ToggleSlider';
import { readBrowserStorage } from '@/i18n/i18n';
import { readLanguageFamily, type SupportedLanguage } from '@/i18n/i18n.utils';
import { writeSavedLanguage } from '@/i18n/locale-storage.utils';

const LANGUAGE_BY_IS_FRENCH: Record<`${boolean}`, SupportedLanguage> = {
  true: 'fr',
  false: 'en',
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const isFrenchActive = readLanguageFamily(i18n.language) === 'fr';

  function selectLanguage(isFrenchChosen: boolean): void {
    const language = LANGUAGE_BY_IS_FRENCH[`${isFrenchChosen}`];
    void i18n.changeLanguage(language);
    writeSavedLanguage(readBrowserStorage(), language);
  }

  return (
    <ToggleSlider
      isOn={isFrenchActive}
      onToggle={selectLanguage}
      leftLabel={t('top-bar.language.english')}
      rightLabel={t('top-bar.language.french')}
      ariaLabel={t('top-bar.language.aria-label')}
    />
  );
}
