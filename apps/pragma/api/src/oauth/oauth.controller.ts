import { zValidator } from '@hono/zod-validator';
import { type Context, Hono } from 'hono';
import { readMemberId, requireMemberSession } from '../auth/member-session.middleware';
import {
  assistantGrantIdParamSchema,
  authorizationQuerySchema,
  clientRegistrationSchema,
  consentDecisionSchema,
  revocationRequestSchema,
  tokenRequestSchema,
} from './oauth.schema';
import {
  beginAuthorization,
  decideConsent,
  describeAuthorizationServerMetadata,
  describeConsent,
  describeProtectedResourceMetadata,
  exchangeToken,
  listAssistantGrants,
  readClientAddress,
  registerAssistantClient,
  reportFailureToErrorTracking,
  type ReportFailure,
  revokeAssistantGrant,
  revokeToken,
} from './oauth.service';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };

export interface BuildOAuthRoutersOptions {
  readonly clock?: () => Date;
  readonly reportFailure?: ReportFailure;
}

interface ValidationResult {
  readonly success: boolean;
}

function answerInvalidWith(error: string) {
  return (result: ValidationResult, context: Context) => {
    if (!result.success) return context.json({ error }, 400, NO_STORE_HEADERS);
    return undefined;
  };
}

// @FollowsBlueprint controller-split-routers
export function buildOAuthRouters(options: BuildOAuthRoutersOptions = {}) {
  const clock = options.clock ?? (() => new Date());
  const reportFailure = options.reportFailure ?? reportFailureToErrorTracking;

  const discoveryRouter = new Hono()
    .get('/oauth-authorization-server', (context) =>
      context.json(describeAuthorizationServerMetadata()),
    )
    .get('/oauth-protected-resource', (context) =>
      context.json(describeProtectedResourceMetadata()),
    )
    .get('/oauth-protected-resource/mcp', (context) =>
      context.json(describeProtectedResourceMetadata()),
    );

  const authorizationRouter = new Hono()
    .get(
      '/authorize',
      zValidator('query', authorizationQuerySchema, answerInvalidWith('invalid_request')),
      async (context) => {
        const outcome = await beginAuthorization(context.req.valid('query'));
        if (outcome.kind === 'refused') return context.json({ error: outcome.error }, 400);
        return context.redirect(outcome.location, 302);
      },
    )
    .post(
      '/register',
      zValidator('json', clientRegistrationSchema, answerInvalidWith('invalid_client_metadata')),
      async (context) => {
        const outcome = await registerAssistantClient({
          registration: context.req.valid('json'),
          clientAddress: readClientAddress(context),
          now: clock(),
          reportFailure,
        });
        if (outcome.kind === 'rate-limited') return context.json({ error: 'rate-limited' }, 429);
        if (outcome.kind === 'invalid-redirect-uri') {
          return context.json({ error: 'invalid_redirect_uri' }, 400);
        }
        return context.json(outcome.information, 201, NO_STORE_HEADERS);
      },
    )
    .post(
      '/token',
      zValidator('form', tokenRequestSchema, answerInvalidWith('invalid_request')),
      async (context) => {
        const outcome = await exchangeToken({
          request: context.req.valid('form'),
          now: clock(),
          reportFailure,
        });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.error }, 400, NO_STORE_HEADERS);
        }
        return context.json(outcome.tokens, 200, NO_STORE_HEADERS);
      },
    )
    .post(
      '/revoke',
      zValidator('form', revocationRequestSchema, answerInvalidWith('invalid_request')),
      async (context) => {
        await revokeToken(context.req.valid('form').token);
        return context.json({}, 200, NO_STORE_HEADERS);
      },
    );

  const consentRouter = new Hono()
    .use('*', requireMemberSession)
    .get('/consent', zValidator('query', authorizationQuerySchema), async (context) => {
      const outcome = await describeConsent(context.req.valid('query'), readMemberId(context));
      if (outcome.kind === 'invalid-authorization-request') {
        return context.json({ error: outcome.kind }, 400);
      }
      return context.json({
        clientName: outcome.clientName,
        memberFirstName: outcome.memberFirstName,
      });
    })
    .post('/consent', zValidator('json', consentDecisionSchema), async (context) => {
      const { decision, ...query } = context.req.valid('json');
      const outcome = await decideConsent({
        query,
        decision,
        memberId: readMemberId(context),
        now: clock(),
      });
      if (outcome.kind === 'invalid-authorization-request') {
        return context.json({ error: outcome.kind }, 400);
      }
      return context.json({ redirectTo: outcome.redirectTo });
    });

  const grantsRouter = new Hono()
    .use('*', requireMemberSession)
    .get('/', async (context) => {
      const grants = await listAssistantGrants(readMemberId(context));
      return context.json({ grants });
    })
    .delete('/:grantId', zValidator('param', assistantGrantIdParamSchema), async (context) => {
      const { grantId } = context.req.valid('param');
      const outcome = await revokeAssistantGrant(readMemberId(context), grantId);
      if (outcome.kind === 'assistant-grant-not-found') {
        return context.json({ error: outcome.kind }, 404);
      }
      return context.json({ ok: true });
    });

  return { discoveryRouter, authorizationRouter, consentRouter, grantsRouter };
}
