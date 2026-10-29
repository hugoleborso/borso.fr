/** @Feature auth */

import { type JSX, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { didCopyTextToClipboard } from '../../lib/clipboard.adapter';
import { Button } from '../atoms/Button';

type CopyOutcome = 'idle' | 'copied' | 'refused';

const COPY_OUTCOME_KEY = {
  idle: null,
  copied: 'account.assistants.copied',
  refused: 'account.assistants.copyFailed',
} as const;

export interface InstallCommandBlockProps {
  readonly label: string;
  readonly hint: string;
  readonly snippet: string;
}

// @FollowsBlueprint molecule-local-state
export function InstallCommandBlock(props: InstallCommandBlockProps): JSX.Element {
  const { t } = useTranslation();
  const [copyOutcome, setCopyOutcome] = useState<CopyOutcome>('idle');
  const outcomeKey = COPY_OUTCOME_KEY[copyOutcome];
  const copySnippet = async (): Promise<void> => {
    const isCopied = await didCopyTextToClipboard(props.snippet);
    setCopyOutcome(isCopied ? 'copied' : 'refused');
  };

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-meta font-medium text-ink m-0">{props.label}</h3>
        <Button type="button" size="sm" icon="copy" onClick={() => void copySnippet()}>
          {t('account.assistants.copy')}
        </Button>
      </div>
      <pre className="m-0 max-w-full whitespace-pre-wrap break-all rounded-md bg-sunk border border-rule px-3 py-2 text-meta leading-relaxed text-ink font-mono">
        <code>{props.snippet}</code>
      </pre>
      <p className="text-meta text-ink-soft m-0">{props.hint}</p>
      {outcomeKey === null ? null : (
        <p role="status" className="text-meta text-ink-soft m-0">
          {t(outcomeKey)}
        </p>
      )}
    </div>
  );
}
