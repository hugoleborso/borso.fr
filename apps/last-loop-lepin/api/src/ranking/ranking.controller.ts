import { Hono } from 'hono';
import {
  EditionNotFoundError,
  getDatabase,
  getLapsCsv,
  getSpectatorStandings,
  getStandingsCsv,
} from './ranking.service';

// @FollowsBlueprint controller-public-router
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
  /**
   * @Blueprint controller-file-response
   * @BlueprintName Controller File Response
   * @BlueprintUsage Use for a route that answers with a downloadable file rather than json.
   * @BlueprintDescription Sets the content type and a `content-disposition` naming the file after the edition, then answers with `context.body(csv)` rather than `context.json`, so the string is sent verbatim instead of being quoted and escaped as a json document.
   */
  .get('/standings/:editionSlug/csv', async (context) => {
    const editionSlug = context.req.param('editionSlug');
    try {
      const csv = await getStandingsCsv(getDatabase(), editionSlug, new Date());
      context.header('content-type', 'text/csv; charset=utf-8');
      context.header('content-disposition', `attachment; filename="standings-${editionSlug}.csv"`);
      return context.body(csv);
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  // @FollowsBlueprint controller-file-response
  .get('/standings/:editionSlug/laps.csv', async (context) => {
    const editionSlug = context.req.param('editionSlug');
    try {
      const csv = await getLapsCsv(getDatabase(), editionSlug, new Date());
      context.header('content-type', 'text/csv; charset=utf-8');
      context.header('content-disposition', `attachment; filename="laps-${editionSlug}.csv"`);
      return context.body(csv);
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  });

export { rankingRouter };
