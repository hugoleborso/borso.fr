import { useTranslation } from 'react-i18next';

export function App() {
  const { t } = useTranslation();
  return (
    <main className="scaffold">
      <header className="scaffold-header">
        <h1>{t('scaffold.title')}</h1>
        <p>{t('scaffold.subtitle')}</p>
      </header>
    </main>
  );
}
