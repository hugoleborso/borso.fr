/**
 * Read-only song detail page — mirrors the prototype's `SongDetail`
 * (design-bundle/project/src/screens/catalog.jsx lines 141-260):
 *  - header carries the status chip, chart-kind badge, title, artist
 *    + tonality + status meta, and right-side actions (Edit / Mode
 *    scène),
 *  - left column: chord-chart preview card + external-links card
 *    (oEmbed iframes via SongExternalLinks),
 *  - right aside: lineup-par-défaut card (member chip + instrument
 *    tag), mastery card (ten coloured bars per member, score x/10).
 *
 * The edit form lives in SongEditPage.tsx at /catalog/:songId/edit;
 * pressing the Edit button navigates there.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Icon } from '../../components/atoms/Icon';
import { ChartKindIcon } from '../../components/molecules/ChartKindIcon';
import { MemberChip } from '../../components/molecules/MemberChip';
import { StatusChip } from '../../components/molecules/StatusChip';
import { ChordChartViewer } from '../../components/organisms/ChordChartViewer';
import { ApiError, apiRequest } from '../../lib/api-client';
import { resolveEmbed } from '../../lib/embed.utils';
import { extractChartKind } from './chart-kind.utils';

const linkSchema = z.object({
  url: z.string(),
  provider: z.enum(['spotify', 'deezer', 'youtube', 'other']),
  comment: z.string().default(''),
});

const songSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  artist: z.string(),
  status: z.enum(['idea', 'wip', 'rehearsed', 'concert_ready']),
  tonalityStart: z.string().nullable(),
  tonalityEnd: z.string().nullable(),
  baseEnergy: z.number().nullable(),
  links: z.array(linkSchema).default([]),
  defaultLineup: z.record(z.string(), z.string().nullable()).default({}),
  chart: z
    .union([
      z.object({ kind: z.literal('chordpro'), text: z.string() }),
      z.object({ kind: z.literal('pdf'), s3Key: z.string() }),
      z.object({ kind: z.literal('image'), s3Key: z.string() }),
    ])
    .nullable(),
});
const singleSongSchema = z.object({ song: songSchema });

const memberSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  color: z.string(),
});
const memberListSchema = z.object({ members: z.array(memberSchema) });

const instrumentSchema = z.object({ id: z.string().uuid(), name: z.string() });
const instrumentListSchema = z.object({ instruments: z.array(instrumentSchema) });

const masteryDefaultSchema = z.object({
  memberId: z.string().uuid(),
  instrumentId: z.string().uuid(),
  score: z.number(),
});
const masteryDefaultListSchema = z.object({ defaults: z.array(masteryDefaultSchema) });

type Song = z.infer<typeof songSchema>;
type Member = z.infer<typeof memberSchema>;
type Instrument = z.infer<typeof instrumentSchema>;
type MasteryDefault = z.infer<typeof masteryDefaultSchema>;

const MASTERY_BAR_COUNT = 10;
const MAX_TONALITY_RENDER_LENGTH = 16;

function tonalityLabel(start: string | null, end: string | null): string | null {
  if (start === null) return null;
  if (end !== null && end !== start) return `${start} → ${end}`;
  return start;
}

export function SongDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { songId } = useParams<{ songId: string }>();
  const [song, setSong] = useState<Song | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [masteryDefaults, setMasteryDefaults] = useState<MasteryDefault[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    if (songId === undefined) return;
    setLoading(true);
    try {
      const [songBody, membersBody, instrumentsBody, masteryBody] = await Promise.all([
        apiRequest(`/api/songs/${songId}`).then((body) => singleSongSchema.parse(body)),
        apiRequest('/api/members').then((body) => memberListSchema.parse(body)),
        apiRequest('/api/instruments').then((body) => instrumentListSchema.parse(body)),
        apiRequest('/api/mastery/defaults').then((body) => masteryDefaultListSchema.parse(body)),
      ]);
      setSong(songBody.song);
      setMembers(membersBody.members);
      setInstruments(instrumentsBody.instruments);
      setMasteryDefaults(masteryBody.defaults);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'unknown-error');
    } finally {
      setLoading(false);
    }
  }, [songId]);

  useEffect(() => {
    void load();
  }, [load]);

  const masteryLookup = useMemo(() => {
    const lookup = new Map<string, number>();
    for (const row of masteryDefaults) {
      lookup.set(`${row.memberId}::${row.instrumentId}`, row.score);
    }
    return lookup;
  }, [masteryDefaults]);

  if (loading) {
    return (
      <p className="px-9 py-7 text-ink-400 italic text-sm">{t('common.loading')}</p>
    );
  }
  if (song === null) {
    return (
      <p className="px-9 py-7 text-danger text-sm" role="alert">
        {error ?? 'not-found'}
      </p>
    );
  }

  const chartKind = extractChartKind(song.chart ?? null);
  const tonality = tonalityLabel(song.tonalityStart, song.tonalityEnd);
  const labelClass = 'text-[11px] tracking-wider uppercase text-ink-400 font-medium';

  return (
    <section className="px-9 py-7 pb-20 max-w-[1280px] flex flex-col gap-5">
      <Link
        to="/catalog"
        className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors no-underline"
      >
        <Icon name="chevL" size={14} />
        {t('catalog.backToCatalog')}
      </Link>

      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-[11px] tracking-wider uppercase text-ink-500 mb-1">
            {song.artist.length > 0 ? song.artist : t('catalog.crumb')}
          </div>
          <h1 className="font-display italic text-[56px] leading-[0.95] tracking-[-0.015em] text-ink-900 m-0 mb-2">
            {song.title}
          </h1>
          <div className="flex items-center gap-2.5 text-[13px] text-ink-500 flex-wrap">
            <span>{song.artist}</span>
            {tonality !== null ? (
              <>
                <span className="text-ink-300">·</span>
                <span className="font-mono text-xs">
                  {tonality.slice(0, MAX_TONALITY_RENDER_LENGTH)}
                </span>
              </>
            ) : null}
            <span className="text-ink-300">·</span>
            <StatusChip status={song.status} />
            <span className="text-ink-300">·</span>
            <ChartKindIcon kind={chartKind} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/catalog/${song.id}/edit`}>
            <Button variant="default" type="button">
              <Icon name="edit" size={14} />
              {t('common.edit')}
            </Button>
          </Link>
          <Link to={`/catalog/${song.id}/scene`}>
            <Button variant="accent" type="button">
              <Icon name="play" size={14} />
              {t('catalog.openScene')}
            </Button>
          </Link>
        </div>
      </header>

      {error !== null ? (
        <p className="text-danger text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {chartKind === 'chordpro' && song.chart !== null && song.chart.kind === 'chordpro' ? (
            <Card variant="bare">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg-sunk">
                <Icon name="text" size={14} className="text-ink-500" />
                <span className="text-xs font-medium">{t('catalog.previewTitle')}</span>
                <span className="flex-1" />
                <Link
                  to={`/catalog/${song.id}/scene`}
                  className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900 no-underline"
                >
                  <Icon name="play" size={12} />
                  {t('catalog.openScene')}
                </Link>
              </div>
              <div className="p-4">
                <ChordChartViewer source={song.chart.text} compact />
              </div>
            </Card>
          ) : null}

          {song.links.length > 0 ? (
            <Card>
              <div className={`${labelClass} mb-2.5`}>{t('catalog.linksTitle')}</div>
              <ul className="flex flex-col gap-2">
                {song.links.map((link) => {
                  const embed = resolveEmbed(link.url);
                  return (
                    <li
                      key={link.url}
                      className="bg-bg border border-line rounded-md p-2 flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        {embed.kind === 'oembed' ? (
                          <iframe
                            src={embed.iframeSrc}
                            title={`${link.provider}-${link.url}`}
                            width={embed.width}
                            height={embed.height}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            allow="encrypted-media; autoplay; clipboard-write; picture-in-picture"
                            allowFullScreen
                            className="rounded-md max-w-full"
                          />
                        ) : (
                          <a
                            href={embed.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-accent hover:underline break-all"
                          >
                            {embed.href}
                          </a>
                        )}
                        {link.comment.length > 0 ? (
                          <div className="text-[11px] text-ink-500 mt-1">{link.comment}</div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <div className={`${labelClass} mb-2.5`}>{t('catalog.defaultLineup')}</div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(song.defaultLineup).length === 0 ? (
                <span className="text-xs text-ink-400 italic">—</span>
              ) : null}
              {Object.entries(song.defaultLineup).map(([memberId, instrumentId]) => {
                const member = members.find((candidate) => candidate.id === memberId);
                if (member === undefined) return null;
                const instrument = instruments.find((candidate) => candidate.id === instrumentId);
                return (
                  <div
                    key={memberId}
                    className="flex items-center gap-2.5 py-1.5 border-b border-dashed border-line last:border-b-0"
                  >
                    <MemberChip memberName={member.firstName} memberColor={member.color} />
                    <span className="text-[12.5px] text-ink-900 flex-1">{member.firstName}</span>
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-500">
                      {instrument?.name ?? '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className={`${labelClass} mb-2.5`}>{t('catalog.mastery')}</div>
            <div className="flex flex-col gap-2">
              {Object.entries(song.defaultLineup).length === 0 ? (
                <span className="text-xs text-ink-400 italic">—</span>
              ) : null}
              {Object.entries(song.defaultLineup).map(([memberId, instrumentId]) => {
                const member = members.find((candidate) => candidate.id === memberId);
                if (member === undefined) return null;
                const score = instrumentId === null
                  ? null
                  : masteryLookup.get(`${memberId}::${instrumentId}`) ?? null;
                return (
                  <div key={memberId} className="flex items-center gap-2.5">
                    <MemberChip memberName={member.firstName} memberColor={member.color} />
                    <span className="text-[12.5px] flex-1 text-ink-900">{member.firstName}</span>
                    <div className="flex gap-px">
                      {Array.from({ length: MASTERY_BAR_COUNT }).map((_, barIndex) => (
                        <span
                          // biome-ignore lint/suspicious/noArrayIndexKey: mastery bars are a stable visual sequence
                          key={barIndex}
                          className="w-1.5 h-3.5 rounded-[1px]"
                          style={{
                            background:
                              score !== null && barIndex < score ? member.color : 'var(--color-bg-sunk)',
                            opacity: score !== null && barIndex < score ? 0.85 : 1,
                          }}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-[11px] text-ink-400 min-w-[24px] text-right">
                      {score !== null ? `${score}/10` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {song.baseEnergy !== null ? (
            <Card variant="flat" className="bg-bg-sunk border-0">
              <div className={`${labelClass} mb-1.5`}>{t('catalog.baseEnergy')}</div>
              <div className="font-mono text-[14px] text-ink-700">{song.baseEnergy}/10</div>
            </Card>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
