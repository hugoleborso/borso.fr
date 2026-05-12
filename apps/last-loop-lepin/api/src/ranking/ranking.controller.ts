import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import { EditionNotFoundError } from '../edition/edition.service';
import { computeStandingsForEdition } from './ranking.service';

const rankingRouter = new Hono();

rankingRouter.get('/standings/:editionSlug', async (context) => {
  try {
    const standings = await computeStandingsForEdition(
      getDatabase(),
      context.req.param('editionSlug'),
      new Date(),
    );
    context.header('Cache-Control', 'max-age=2, stale-while-revalidate=10');
    return context.json({ standings });
  } catch (error) {
    if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
    throw error;
  }
});

export { rankingRouter };
