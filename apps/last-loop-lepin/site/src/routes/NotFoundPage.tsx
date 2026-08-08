import { useTranslation } from 'react-i18next';
import { Card, CardBody } from '../components/atoms/Card';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="main col">
      <Card>
        <CardBody modifier="not-found">
          <img src="/404.jpeg" alt={t('not-found.image-alt')} className="not-found-image" />
          <p className="muted">{t('not-found.message')}</p>
          <a href="/" className="not-found-home">
            {t('not-found.home')}
          </a>
        </CardBody>
      </Card>
    </div>
  );
}
