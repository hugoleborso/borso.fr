import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { getDatabase } from '../database/client';
import { requireAdminSession } from '../auth/auth.middleware';
import { GpxParseError } from '../helpers/gpx/gpx.core';
import { SunCalculationError } from '../helpers/sun/sun.core';
import { createEditionInputSchema, updateEditionInputSchema } from './edition.schema';
import {
  EditionAlreadyExistsError,
  EditionNotFoundError,
  EditionNotInSetupError,
  createEdition,
  getAllEditions,
  getEdition,
  getEditionOrNull,
  removeSetupEdition,
  replaceSetupEdition,
  transitionEditionStatus,
} from './edition.service';

const editionRouter = new Hono()
  .get('/', async (context) => {
    const editions = await getAllEditions(getDatabase());
    return context.json({ editions });
  })
  .get('/current', async (context) => {
    const editions = await getAllEditions(getDatabase());
    const live = editions.find((edition) => edition.status === 'live');
    const next = editions
      .filter((edition) => edition.status === 'setup')
      .toSorted((left, right) => left.startsAt.getTime() - right.startsAt.getTime())[0];
    // Fallback to the most recent finished edition so spectators see the
    // final ranking + "course terminée" banner until a new one starts,
    // rather than the empty hors-jour-J archive card.
    const lastFinished = editions
      .filter((edition) => edition.status === 'finished')
      .toSorted((left, right) => right.endsAt.getTime() - left.endsAt.getTime())[0];
    const current = live ?? next ?? lastFinished ?? null;
    return context.json({ edition: current });
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

const statusUpdateSchema = z.object({ status: z.enum(['setup', 'live', 'finished']) });

const adminEditionRouter = new Hono()
  .use('*', requireAdminSession)
  .post(
    '/',
    zValidator('json', createEditionInputSchema),
    async (context) => {
      const input = context.req.valid('json');
      try {
        const edition = await createEdition(getDatabase(), {
          slug: input.slug,
          displayName: input.displayName,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          ...(input.intervalMinutes !== undefined ? { intervalMinutes: input.intervalMinutes } : {}),
          gpxXml: input.gpxXml,
        });
        return context.json({ edition }, 201);
      } catch (error) {
        if (error instanceof EditionAlreadyExistsError) {
          return context.json({ error: error.message }, 409);
        }
        if (error instanceof GpxParseError) {
          return context.json({ error: 'gpx parse error', detail: error.message }, 400);
        }
        if (error instanceof SunCalculationError) {
          return context.json({ error: 'sun calculation failed', detail: error.message }, 400);
        }
        throw error;
      }
    },
  )
  .put(
    '/:slug',
    zValidator('json', updateEditionInputSchema),
    async (context) => {
      const slug = context.req.param('slug');
      const input = context.req.valid('json');
      try {
        const edition = await replaceSetupEdition(getDatabase(), slug, {
          displayName: input.displayName,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          ...(input.intervalMinutes !== undefined ? { intervalMinutes: input.intervalMinutes } : {}),
          ...(input.gpxXml !== undefined ? { gpxXml: input.gpxXml } : {}),
        });
        return context.json({ edition });
      } catch (error) {
        if (error instanceof EditionNotFoundError) {
          return context.json({ error: error.message }, 404);
        }
        if (error instanceof EditionNotInSetupError) {
          return context.json({ error: 'edition has already started; setup is locked' }, 409);
        }
        if (error instanceof GpxParseError) {
          return context.json({ error: 'gpx parse error', detail: error.message }, 400);
        }
        if (error instanceof SunCalculationError) {
          return context.json({ error: 'sun calculation failed', detail: error.message }, 400);
        }
        throw error;
      }
    },
  )
  .delete('/:slug', async (context) => {
    const slug = context.req.param('slug');
    try {
      await removeSetupEdition(getDatabase(), slug);
      return context.json({ slug, deleted: true });
    } catch (error) {
      if (error instanceof EditionNotFoundError) {
        return context.json({ error: error.message }, 404);
      }
      if (error instanceof EditionNotInSetupError) {
        return context.json({ error: 'edition has already started; delete is locked' }, 409);
      }
      throw error;
    }
  })
  .put(
    '/:slug/status',
    zValidator('json', statusUpdateSchema),
    async (context) => {
      const slug = context.req.param('slug');
      const { status } = context.req.valid('json');
      try {
        await transitionEditionStatus(getDatabase(), slug, status);
        return context.json({ slug, status });
      } catch (error) {
        if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
        throw error;
      }
    },
  );

export { editionRouter, adminEditionRouter };
