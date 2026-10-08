import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '../atoms/button.variants';
import { Icon } from '../atoms/Icon';
import { closeActionSheet, useShownActionSheet } from '../../lib/action-sheet.hook';
import { buildEnvironmentAddress, composeTalosPrompt } from '../../lib/claude-code-address.core';
import { selectSubjectFile } from '../../lib/discussion-subject.core';
import { useClaudeCodeTarget } from '../../lib/queries/messages.queries';
import { composeDiscussionText, selectSubjectKindLabelKey } from './action-sheet.core';

const SHEET_ROW_CLASS_NAME = 'w-full justify-start min-h-13 px-4 text-body';

// @FollowsBlueprint organism-query-owning
export function ActionSheet(): JSX.Element | null {
  const { t } = useTranslation();
  const sheet = useShownActionSheet();
  const target = useClaudeCodeTarget();
  if (sheet === null) return null;
  const file = selectSubjectFile(sheet.subject);
  const prompt = composeTalosPrompt(
    t('discuss.preamble'),
    composeDiscussionText(
      t('discuss.context', {
        kind: t(selectSubjectKindLabelKey(sheet.subject.kind)),
        title: sheet.title,
        file,
      }),
      sheet.request,
    ),
  );
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label={t('toast.close')}
        className="absolute inset-0 bg-scrim cursor-default"
        onClick={closeActionSheet}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={sheet.title}
        className="relative max-w-[560px] w-full mx-auto rounded-t-lg bg-surface-raised shadow-2 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        <span className="block w-10 h-1 mx-auto mb-3 rounded-full bg-line-strong" />
        <div className="px-1 pb-3 border-b border-line">
          <p className="m-0 text-heading text-ink line-clamp-2">{sheet.title}</p>
          <p className="m-0 mt-0.5 font-mono text-mono-sm text-ink-muted truncate">{file}</p>
          {sheet.details === undefined ? null : (
            <ul className="m-0 mt-2 p-0 list-none flex flex-wrap gap-1.5">
              {sheet.details.map((detail) => (
                <li
                  key={detail}
                  className="px-2 py-0.5 rounded-sm bg-danger-soft text-danger text-label"
                >
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>
        <ul className="m-0 mt-2 p-0 list-none flex flex-col gap-1">
          <li>
            <a
              href={buildEnvironmentAddress(target.data, 'talos', prompt)}
              target="_blank"
              rel="noopener"
              aria-disabled={target.data === undefined}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- the sheet opens on a long press, and the first action is where a keyboard or a screen reader has to land.
              autoFocus
              onClick={closeActionSheet}
              className={buttonVariants({ variant: 'primary', className: SHEET_ROW_CLASS_NAME })}
            >
              <Icon name="discuss" size={20} />
              {t('discuss.open')}
            </a>
          </li>
          {(sheet.actions ?? []).map((action) => (
            <li key={action.labelKey}>
              <button
                type="button"
                onClick={() => {
                  closeActionSheet();
                  action.onSelect();
                }}
                className={buttonVariants({ variant: 'quiet', className: SHEET_ROW_CLASS_NAME })}
              >
                <Icon name={action.icon} size={20} />
                {t(action.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
