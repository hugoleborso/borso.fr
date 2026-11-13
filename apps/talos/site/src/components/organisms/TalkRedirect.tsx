import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '../atoms/button.variants';
import { Icon } from '../atoms/Icon';
import { PageTitle } from '../atoms/PageTitle';
import { QueryState } from '../molecules/QueryState';
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
        <QueryState isPending={link.isPending} onRetry={link.retry} />
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
