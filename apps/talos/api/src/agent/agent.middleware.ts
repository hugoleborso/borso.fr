import type { MiddlewareHandler } from 'hono';
import type { AgentTokenName } from './agent-token.core';
import { authorizeAgent } from './agent.service';

export interface AgentEnvironment {
  readonly Variables: { tokenName: AgentTokenName };
}

// @FollowsBlueprint middleware-session-gate
export const requireAgentToken: MiddlewareHandler<AgentEnvironment> = async (context, next) => {
  context.set('tokenName', await authorizeAgent(context.req.header('authorization')));
  await next();
};
