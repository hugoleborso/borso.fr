import {
  buildEnvironmentAddress,
  type ClaudeCodeEnvironment,
  selectClaudeCodeLinkTarget,
} from './claude-code-address.core';
import { detectClaudeCodeOpener } from './claude-code-opener.adapter';
import { useClaudeCodeTarget } from './queries/messages.queries';

const TALK_ENVIRONMENT: ClaudeCodeEnvironment = 'build';
const NO_PROMPT = '';

export interface TalkToTalosLink {
  readonly href: string | undefined;
  readonly target: string | undefined;
  readonly isPending: boolean;
  readonly retry: () => void;
}

export function useTalkToTalosLink(): TalkToTalosLink {
  const target = useClaudeCodeTarget();
  const opener = detectClaudeCodeOpener();
  return {
    href: buildEnvironmentAddress(target.data, TALK_ENVIRONMENT, NO_PROMPT, opener),
    target: selectClaudeCodeLinkTarget(opener),
    isPending: target.isPending,
    retry: () => void target.refetch(),
  };
}
