import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import {
  EditionNotFoundError,
  getSpectatorStandings,
  getStandingsCsv,
} from './ranking.service';

const rankingRouter = new Hono()
  .get('/standings/:editionSlug', async (context) => {
    try {
      const editionSlug = context.req.param('editionSlug');
      const response = await getSpectatorStandings(getDatabase(), editionSlug, new Date());
      context.header('Cache-Control', 'max-age=2, stale-while-revalidate=10');
      return context.json(response);
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  .get('/standings/:editionSlug/csv', async (context) => {
    const editionSlug = context.req.param('editionSlug') ?? '';
    try {
      const csv = await getStandingsCsv(getDatabase(), editionSlug, new Date());
      context.header('content-type', 'text/csv; charset=utf-8');
      context.header('content-disposition', `attachment; filename="standings-${editionSlug}.csv"`);
      return context.body(csv);
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  });

export { rankingRouter };
