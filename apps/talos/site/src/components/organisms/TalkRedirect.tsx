import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '../atoms/button.variants';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { Spinner } from '../atoms/Spinner';
import { followLinkOnAttach } from '../../lib/departure.adapter';
import { useTalkToTalosLink } from '../../lib/talk-to-talos.hook';

// @FollowsBlueprint organism-query-owning
export function TalkRedirect(): JSX.Element {
  const { t } = useTranslation();
  const link = useTalkToTalosLink();
  return (
    <>
      <PageTitle hasMark>{t('talk.title')}</PageTitle>
      {link.href === undefined ? (
        <div className="py-6 flex justify-center">
          <Spinner label={t('common.loading')} />
        </div>
      ) : (
        <a
          ref={followLinkOnAttach}
          href={link.href}
          target={link.target}
          rel="noopener"
          className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full' })}
        >
          <Icon name="talk" size={20} />
          {t('nav.talk')}
        </a>
      )}
    </>
  );
}
