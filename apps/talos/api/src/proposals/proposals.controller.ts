import { Hono } from 'hono';
import { requireSession } from '../auth/session.middleware';
import {
  proposalDecisionValidator,
  proposalSlugValidator,
  proposalStatusQueryValidator,
} from './proposals.schema';
import { decideProposal, listProposals } from './proposals.service';

// @FollowsBlueprint controller-guarded-router
export function buildProposalsRouter() {
  return new Hono()
    .use('*', requireSession)
    .get('/', proposalStatusQueryValidator, async (context) =>
      context.json(await listProposals(context.req.valid('query').status)),
    )
    .post('/:slug/decision', proposalSlugValidator, proposalDecisionValidator, async (context) => {
      const { decision, comment } = context.req.valid('json');
      const proposal = await decideProposal({
        slug: context.req.valid('param').slug,
        decision,
        comment,
        now: new Date(),
      });
      return context.json(proposal);
    });
}
