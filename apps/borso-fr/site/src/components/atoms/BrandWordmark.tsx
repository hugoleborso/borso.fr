import { useTranslation } from 'react-i18next';

const WORDMARK_CLASS_NAME =
  'inline-flex min-h-11 min-w-11 items-center border-b border-labours-ink pb-px font-labours-sans text-[12px] font-semibold tracking-[0.18em] text-labours-ink uppercase';

// @FollowsBlueprint atom-plain
export function BrandWordmark() {
  const { t } = useTranslation();
  return (
    <a className={WORDMARK_CLASS_NAME} href="/">
      {t('common.brand.name')}
      <span className="text-labours-accent">.</span>
      {t('common.brand.domain')}
    </a>
  );
}
