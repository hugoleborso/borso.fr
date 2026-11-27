import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { buildAudienceRateLimiter } from '../audience/audience-rate-limit.middleware';
import { requireMemberSession } from '../auth/member-session.middleware';
import {
  announcementPatchSchema,
  concertParamSchema,
  concertRegistrationParamSchema,
  posterUploadSchema,
  registrationCreateSchema,
  registrationParamSchema,
  registrationPatchSchema,
} from './concert-registrations.schema';
import {
  amendRegistration,
  listFanWishSongIds,
  listMemberNames,
  listRegistrations,
  listUpcomingConcerts,
  mintPosterUpload,
  patchAnnouncement,
  readAnnouncement,
  register,
  REGISTRATION_TOKEN_HEADER,
} from './concert-registrations.service';
import { readConcertCalendar } from './concert-calendar.service';
import { checkRegistration } from './concert-registration-check.service';
import { removeRegistration } from './concert-registration-removal.service';
import {
  CONCERT_REGISTRATION_READ_BUDGET,
  CONCERT_REGISTRATION_WRITE_BUDGET,
  type ConcertRegistrationRefusal,
} from './concert-registrations.types';

const STATUS_BY_REFUSAL = {
  'not-an-upcoming-concert': 422,
  'not-a-concert': 422,
  'already-registered': 409,
  'disposable-email': 422,
  'invalid-registration-token': 403,
  'unknown-registration': 404,
  'unknown-member': 422,
  'unknown-track': 422,
  'foreign-poster-key': 422,
  'external-search-unavailable': 503,
} as const satisfies Record<ConcertRegistrationRefusal, number>;

const ABSENT_TOKEN = '';
const CALENDAR_CONTENT_TYPE = 'text/calendar; charset=utf-8';
const NO_CONTENT = 204;

// @FollowsBlueprint controller-public-and-gated-routers
export function buildConcertRegistrationsRouter() {
  const limitReads = buildAudienceRateLimiter(CONCERT_REGISTRATION_READ_BUDGET);
  const limitWrites = buildAudienceRateLimiter(CONCERT_REGISTRATION_WRITE_BUDGET);
  const publicRouter = new Hono()
    .get('/upcoming', limitReads, async (context) => {
      const concerts = await listUpcomingConcerts(new Date());
      return context.json({ concerts });
    })
    .get('/members', limitReads, async (context) => {
      const members = await listMemberNames();
      return context.json({ members });
    })
    // @FollowsBlueprint controller-file-response
    .get(
      '/concerts/:sessionId/calendar',
      limitReads,
      zValidator('param', concertParamSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const outcome = await readConcertCalendar({ sessionId, now: new Date() });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        context.header('content-type', CALENDAR_CONTENT_TYPE);
        context.header('content-disposition', `attachment; filename="${outcome.fileName}"`);
        return context.body(outcome.calendar);
      },
    )
    .post(
      '/concerts/:sessionId/registrations',
      limitWrites,
      zValidator('param', concertParamSchema),
      zValidator('json', registrationCreateSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const { firstName, email } = context.req.valid('json');
        const outcome = await register({ sessionId, firstName, email, now: new Date() });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json(
          { registrationId: outcome.registrationId, editToken: outcome.editToken },
          201,
        );
      },
    )
    .get(
      '/registrations/:registrationId',
      limitReads,
      zValidator('param', registrationParamSchema),
      async (context) => {
        const { registrationId } = context.req.valid('param');
        const outcome = await checkRegistration({
          registrationId,
          editToken: context.req.header(REGISTRATION_TOKEN_HEADER) ?? ABSENT_TOKEN,
        });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json({ registrationId });
      },
    )
    .patch(
      '/registrations/:registrationId',
      limitWrites,
      zValidator('param', registrationParamSchema),
      zValidator('json', registrationPatchSchema),
      async (context) => {
        const { registrationId } = context.req.valid('param');
        const answers = context.req.valid('json');
        const outcome = await amendRegistration({
          registrationId,
          editToken: context.req.header(REGISTRATION_TOKEN_HEADER) ?? ABSENT_TOKEN,
          ...answers,
          now: new Date(),
        });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json({ registration: outcome.registration });
      },
    );

  const gatedRouter = new Hono()
    .get(
      '/concerts/:sessionId/announcement',
      requireMemberSession,
      zValidator('param', concertParamSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const outcome = await readAnnouncement(sessionId, new Date());
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json(outcome.announcement);
      },
    )
    .patch(
      '/concerts/:sessionId/announcement',
      requireMemberSession,
      zValidator('param', concertParamSchema),
      zValidator('json', announcementPatchSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const changes = context.req.valid('json');
        const outcome = await patchAnnouncement({ sessionId, ...changes, now: new Date() });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json(outcome.announcement);
      },
    )
    .post(
      '/concerts/:sessionId/poster-upload',
      requireMemberSession,
      zValidator('param', concertParamSchema),
      zValidator('json', posterUploadSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const { contentType, byteSize } = context.req.valid('json');
        const outcome = await mintPosterUpload({
          sessionId,
          contentType,
          byteSize,
          now: new Date(),
        });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json({ uploadUrl: outcome.uploadUrl, s3Key: outcome.s3Key });
      },
    )
    .get(
      '/concerts/:sessionId/registrations',
      requireMemberSession,
      zValidator('param', concertParamSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const registrations = await listRegistrations(sessionId);
        return context.json({ registrations });
      },
    )
    .delete(
      '/concerts/:sessionId/registrations/:registrationId',
      requireMemberSession,
      zValidator('param', concertRegistrationParamSchema),
      async (context) => {
        const outcome = await removeRegistration(context.req.valid('param'));
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.body(null, NO_CONTENT);
      },
    )
    .get('/fan-wishes', requireMemberSession, async (context) => {
      const songIds = await listFanWishSongIds();
      return context.json({ songIds });
    });

  return { publicRouter, gatedRouter };
}
