/**
 * Standalone route wrapper for `/sessions/:sessionId/setlist`. Resolves
 * the session's setlist (or creates one if missing) and renders the
 * editor. Spec lists this URL as a first-class surface ("Functional
 * surfaces required" in spec.md); without the wrapper, deep-link
 * navigation 404'd at the React Router layer despite the CloudFront
 * SPA fallback serving index.html.
 *
 * Falls back to a small CTA when no setlist exists yet; one click
 * creates the setlist for the session and the editor mounts.
 *
 * The header naming the session and linking back to it is not decoration:
 * reached as a deep link, this route used to carry no title and no link at
 * all, so the set on screen belonged to no readable session and the only way
 * out was the bottom bar.
 * @Feature setlists
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../../components/atoms/Button';
import { BackLink } from '../../components/molecules/BackLink';
import { PageHeader } from '../../components/molecules/PageHeader';
import { formatSessionDate } from '../../lib/formatters.utils';
import { useSession } from '../../lib/queries/sessions.queries';
import {
  useCreateSetlist,
  useIsCreatingSetlist,
  useSetlistBySession,
} from '../../lib/queries/setlists.queries';
import { SetlistEditor } from '../../components/organisms/SetlistEditor';

// @FollowsBlueprint route-detail-page
export function SetlistEditorPage(): JSX.Element {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { t } = useTranslation();
  if (sessionId === undefined) {
    return <p className="px-4 sm:px-9 py-7 text-danger">{t('setlist.missingSessionId')}</p>;
  }
  return <ResolveSetlist sessionId={sessionId} />;
}

function ResolveSetlist({ sessionId }: { sessionId: string }): JSX.Element {
  const { t, i18n } = useTranslation();
  const setlistQuery = useSetlistBySession(sessionId);
  const createSetlist = useCreateSetlist();
  const isCreating = useIsCreatingSetlist();
  const sessionQuery = useSession(sessionId);
  const session = sessionQuery.data?.session ?? null;
  const sessionHeader = (
    <>
      <BackLink to={`/sessions/${sessionId}`} label={t('common.back')} />
      <PageHeader
        crumb={t('setlist.crumb')}
        title={
          session === null ? t('setlist.title') : formatSessionDate(session.date, i18n.language)
        }
        subtitle={session?.venue ?? undefined}
      />
    </>
  );

  if (setlistQuery.isLoading || isCreating) {
    return <p className="px-4 sm:px-9 py-7 italic text-ink-400 text-sm">{t('common.loading')}</p>;
  }

  if (setlistQuery.error) {
    return (
      <p className="px-4 sm:px-9 py-7 text-danger text-sm" role="alert">
        {setlistQuery.error.message}
      </p>
    );
  }

  const setlist = setlistQuery.data?.setlist ?? null;

  if (setlist === null) {
    return (
      <section className="px-4 sm:px-9 py-7 max-w-[1280px] flex flex-col">
        {sessionHeader}
        <div className="bg-bg-elev border border-line rounded-md p-6 flex flex-col gap-3 items-start">
          <p className="text-ink-700">{t('setlist.noSetlistYet')}</p>
          <Button
            variant="accent"
            onClick={() => createSetlist.mutate({ sessionId })}
            disabled={createSetlist.isPending}
          >
            {createSetlist.isPending ? t('common.loading') : t('setlist.createForSession')}
          </Button>
          {createSetlist.isError ? (
            <p className="text-danger text-sm" role="alert">
              {t('setlist.failure.create')}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-9 py-7 pb-20 max-w-[1280px] flex flex-col">
      {sessionHeader}
      <SetlistEditor setlistId={setlist.id} />
    </section>
  );
}
