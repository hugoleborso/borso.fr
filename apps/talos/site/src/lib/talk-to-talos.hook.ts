import { useTranslation } from 'react-i18next';
import {
  buildEnvironmentAddress,
  type ClaudeCodeEnvironment,
  selectClaudeCodeLinkTarget,
} from './claude-code-address.core';
import { detectClaudeCodeOpener } from './claude-code-opener.adapter';
import { useClaudeCodeTarget } from './queries/messages.queries';

const TALK_ENVIRONMENT: ClaudeCodeEnvironment = 'build';

export interface TalkToTalosLink {
  readonly href: string | undefined;
  readonly target: string | undefined;
}

export function useTalkToTalosLink(): TalkToTalosLink {
  const { t } = useTranslation();
  const target = useClaudeCodeTarget();
  const opener = detectClaudeCodeOpener();
  return {
    href: buildEnvironmentAddress(target.data, TALK_ENVIRONMENT, t('talk.prompt'), opener),
    target: selectClaudeCodeLinkTarget(opener),
  };
}
