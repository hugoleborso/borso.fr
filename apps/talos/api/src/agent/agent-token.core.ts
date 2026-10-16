import { areSecretsEqual } from '../helpers/crypto/secret-comparison.utils';
import { readBearerToken } from '../helpers/http/bearer-token.core';

export const AGENT_TOKEN_NAMES = ['lecture', 'build', 'mac'] as const;
export type AgentTokenName = (typeof AGENT_TOKEN_NAMES)[number];

export interface ConfiguredToken {
  readonly name: AgentTokenName;
  readonly value: string | undefined;
}

// @FollowsBlueprint core-decision
export function selectAgentTokenName(
  authorizationHeader: string | undefined,
  configured: readonly ConfiguredToken[],
): AgentTokenName | null {
  const provided = readBearerToken(authorizationHeader ?? '');
  if (provided === null) return null;
  const comparisons = configured.map((token) => ({
    name: token.name,
    isMatching:
      token.value !== undefined && token.value !== '' && areSecretsEqual(provided, token.value),
  }));
  return comparisons.find((comparison) => comparison.isMatching)?.name ?? null;
}
