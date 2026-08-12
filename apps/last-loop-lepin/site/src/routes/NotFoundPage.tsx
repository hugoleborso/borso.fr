import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '../components/atoms/Card';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 p-6 min-h-0">
      <Card>
        <CardBody padding="even" className="flex flex-col items-center gap-4">
          <img
            src="/404.jpeg"
            alt={t('not-found.image-alt')}
            className="max-w-full max-h-[60vh] rounded-lg object-contain"
          />
          <p className="text-ink-3">{t('not-found.message')}</p>
          <a href="/" className="text-[14px] text-accent underline">
            {t('not-found.home')}
          </a>
        </CardBody>
      </Card>
    </div>
  );
}
