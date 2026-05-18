import { Hono } from 'hono';
import { getDatabase } from '../database/client';
import { EditionNotFoundError } from '../edition/edition.service';
import { listPunchesForEdition } from '../punch/punch.repository';
import { readPhotosCdnHost, toRunnerDto } from '../runner/runner.dto.utils';
import { computeStandingsForEdition } from './ranking.service';

const rankingRouter = new Hono()
  .get('/standings/:editionSlug', async (context) => {
    try {
      const editionSlug = context.req.param('editionSlug');
      const standings = await computeStandingsForEdition(getDatabase(), editionSlug, new Date());
      // The Standings pure-core type intentionally doesn't carry
      // correction metadata (`correctedAt` belongs to the punch, not the
      // ranking). The controller derives it once per response so the
      // front can drive the public correction banner without a separate
      // round-trip.
      const punches = await listPunchesForEdition(getDatabase(), editionSlug);
      // A "correction" — for the public banner spec — is either an edit
      // (`correctedAt`) or a cancellation (`voidedAt`). Both surface as
      // "Pointage corrigé à HH:MM".
      const mostRecentCorrectionAt = punches.reduce<Date | null>((accumulator, punch) => {
        const candidates: Date[] = [];
        if (punch.correctedAt !== null) candidates.push(punch.correctedAt);
        if (punch.voidedAt !== null) candidates.push(punch.voidedAt);
        return candidates.reduce<Date | null>(
          (inner, candidate) =>
            inner === null || candidate.getTime() > inner.getTime() ? candidate : inner,
          accumulator,
        );
      }, null);
      context.header('Cache-Control', 'max-age=2, stale-while-revalidate=10');
      const cdnHost = readPhotosCdnHost();
      const rankedWithDto = standings.ranked.map((entry) => ({
        ...entry,
        runner: toRunnerDto(entry.runner, cdnHost),
      }));
      return context.json({
        standings: { ...standings, ranked: rankedWithDto },
        mostRecentCorrectionAt: mostRecentCorrectionAt?.toISOString() ?? null,
      });
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  })
  .get('/standings/:editionSlug/csv', async (context) => {
    const editionSlug = context.req.param('editionSlug') ?? '';
    try {
      const standings = await computeStandingsForEdition(getDatabase(), editionSlug, new Date());
      const header = 'rank,bib,runner_slug,display_name,status,out_at_loop,last_loop,last_finished_at\n';
      const lines = standings.ranked.map((entry) => {
        const status = entry.status.kind;
        const outAtLoop = entry.status.kind === 'dnf' ? entry.status.outAtLoop : '';
        const lastLoop = entry.status.kind === 'in-race' ? entry.status.lastLoop : '';
        const finishedIso = entry.lastFinishedAt?.toISOString() ?? '';
        const csvSafe = (value: string): string => `"${value.replace(/"/g, '""')}"`;
        return [
          entry.rank === 'ex-aequo' ? 'ex-aequo' : `${entry.rank}`,
          entry.runner.bib ?? '',
          entry.runner.slug,
          csvSafe(entry.runner.displayName),
          status,
          outAtLoop,
          lastLoop,
          finishedIso,
        ].join(',');
      });
      const body = `${header}${lines.join('\n')}\n`;
      context.header('content-type', 'text/csv; charset=utf-8');
      context.header('content-disposition', `attachment; filename="standings-${editionSlug}.csv"`);
      return context.body(body);
    } catch (error) {
      if (error instanceof EditionNotFoundError) return context.json({ error: error.message }, 404);
      throw error;
    }
  });

export { rankingRouter };
