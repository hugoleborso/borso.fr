import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireAdminSession } from '../auth/auth.middleware';
import {
  createEditionInputSchema,
  editionStatusUpdateSchema,
  updateEditionInputSchema,
} from './edition.schema';
import {
  createEditionFromInput,
  EditionAlreadyExistsError,
  EditionNotFoundError,
  EditionNotInSetupError,
  getAllEditions,
  getCurrentEdition,
  getDatabase,
  getEdition,
  getEditionOrNull,
  GpxParseError,
  removeSetupEdition,
  replaceEditionFromInput,
  SunCalculationError,
  transitionEditionStatus,
} from './edition.service';

// @FollowsBlueprint controller-public-router
const editionRouter = new Hono()
  .get('/', async (context) => {
    const editions = await getAllEditions(getDatabase());
    return context.json({ editions });
  })
  .get('/current', async (context) => {
    const edition = await getCurrentEdition(getDatabase());
    return context.json({ edition });
  })
  .get('/:slug', async (context) => {
    try {
      const edition = await getEdition(getDatabase(), context.req.param('slug'));
      return context.json({ edition });
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  .get('/:slug/state', async (context) => {
    const edition = await getEditionOrNull(getDatabase(), context.req.param('slug'));
    if (edition === null) return context.json({ error: 'edition not found' }, 404);
    return context.json({ edition });
  });

// @FollowsBlueprint controller-guarded-router
const adminEditionRouter = new Hono()
  .use('*', requireAdminSession)
  .post('/', zValidator('json', createEditionInputSchema), async (context) => {
    try {
      const edition = await createEditionFromInput(getDatabase(), context.req.valid('json'));
      return context.json({ edition }, 201);
    } catch (error) {
      if (error instanceof EditionAlreadyExistsError)
        return context.json({ error: error.message }, 409);
      if (error instanceof GpxParseError)
        return context.json({ error: 'gpx parse error', detail: error.message }, 400);
      if (error instanceof SunCalculationError)
        return context.json({ error: 'sun calculation failed', detail: error.message }, 400);
      throw error;
    }
  })
  .put('/:slug', zValidator('json', updateEditionInputSchema), async (context) => {
    try {
      const edition = await replaceEditionFromInput(
        getDatabase(),
        context.req.param('slug'),
        context.req.valid('json'),
      );
      return context.json({ edition });
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      if (error instanceof EditionNotInSetupError)
        return context.json({ error: 'edition has already started; setup is locked' }, 409);
      if (error instanceof GpxParseError)
        return context.json({ error: 'gpx parse error', detail: error.message }, 400);
      if (error instanceof SunCalculationError)
        return context.json({ error: 'sun calculation failed', detail: error.message }, 400);
      throw error;
    }
  })
  .delete('/:slug', async (context) => {
    const slug = context.req.param('slug');
    try {
      await removeSetupEdition(getDatabase(), slug);
      return context.json({ slug, deleted: true });
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      if (error instanceof EditionNotInSetupError)
        return context.json({ error: 'edition has already started; delete is locked' }, 409);
      throw error;
    }
  })
  .put('/:slug/status', zValidator('json', editionStatusUpdateSchema), async (context) => {
    const slug = context.req.param('slug');
    const { status } = context.req.valid('json');
    try {
      await transitionEditionStatus(getDatabase(), slug, status);
      return context.json({ slug, status });
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  });

export { adminEditionRouter, editionRouter };
