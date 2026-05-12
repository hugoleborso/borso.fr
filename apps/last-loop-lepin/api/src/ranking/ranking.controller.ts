import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import { EditionNotFoundError } from '../edition/edition.service';
import { listPunchesForEdition } from '../punch/punch.repository';
import { computeStandingsForEdition } from './ranking.service';

const rankingRouter = new Hono();

rankingRouter.get('/standings/:editionSlug', async (context) => {
  try {
    const editionSlug = context.req.param('editionSlug');
    const standings = await computeStandingsForEdition(getDatabase(), editionSlug, new Date());
    // The Standings pure-core type intentionally doesn't carry
    // correction metadata (`correctedAt` belongs to the punch, not the
    // ranking). The controller derives it once per response so the
    // front can drive the public correction banner without a separate
    // round-trip.
    const punches = await listPunchesForEdition(getDatabase(), editionSlug);
    const mostRecentCorrectionAt = punches.reduce<Date | null>((accumulator, punch) => {
      if (punch.correctedAt === null) return accumulator;
      if (accumulator === null) return punch.correctedAt;
      return punch.correctedAt.getTime() > accumulator.getTime() ? punch.correctedAt : accumulator;
    }, null);
    context.header('Cache-Control', 'max-age=2, stale-while-revalidate=10');
    return context.json({
      standings,
      mostRecentCorrectionAt: mostRecentCorrectionAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
    throw error;
  }
});

export { rankingRouter };
