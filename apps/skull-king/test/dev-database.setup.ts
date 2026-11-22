import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import { type BonusCounts, NO_BONUS } from '@domain/scoring.core';
import { setup as applyMigrations } from './setup-postgres';

const JOIN_CODE = 'BRIG';
const CURRENT_ROUND = 5;
const CURRENT_PHASE = 'bidding';

interface SeededPlayer {
  readonly name: string;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
}

interface SeededEntry {
  readonly bid: number;
  readonly tricks?: number;
  readonly bonuses?: Partial<BonusCounts>;
}

const PLAYERS: readonly SeededPlayer[] = [
  { name: 'Hugo', icon: 'skull', color: 'gold' },
  { name: 'Léa', icon: 'parrot', color: 'lagoon' },
  { name: 'Max', icon: 'anchor', color: 'coral' },
  { name: 'Inès', icon: 'crown', color: 'amethyst' },
];

const ENTRIES_BY_ROUND: ReadonlyMap<number, readonly (SeededEntry | null)[]> = new Map([
  [1, [{ bid: 1 }, { bid: 0 }, { bid: 0 }, { bid: 0 }]],
  [2, [{ bid: 1 }, { bid: 1 }, { bid: 0 }, { bid: 1, tricks: 0 }]],
  [3, [{ bid: 0 }, { bid: 2, bonuses: { standardFourteen: 1 } }, { bid: 1 }, { bid: 0 }]],
  [
    4,
    [
      { bid: 2, tricks: 1 },
      { bid: 1, bonuses: { loot: 1 } },
      { bid: 1, bonuses: { pirateBySkullKing: 1 } },
      { bid: 1 },
    ],
  ],
  [5, [{ bid: 2 }, null, { bid: 1 }, null]],
]);

async function seedMidGame(sql: postgres.Sql, now: Date): Promise<void> {
  const gameId = randomUUID();
  const playerIds = PLAYERS.map(() => randomUUID());
  await sql`INSERT INTO join_code_claim (join_code, game_id) VALUES (${JOIN_CODE}, ${gameId})`;
  await sql`INSERT INTO game (id, join_code, phase, current_round, created_at, updated_at)
    VALUES (${gameId}, ${JOIN_CODE}, ${CURRENT_PHASE}, ${CURRENT_ROUND}, ${now}, ${now})`;
  for (const [seat, player] of PLAYERS.entries()) {
    await sql`INSERT INTO player (id, game_id, seat, name, icon, color)
      VALUES (${playerIds[seat] ?? ''}, ${gameId}, ${seat}, ${player.name}, ${player.icon}, ${player.color})`;
  }
  for (const [roundNumber, entries] of ENTRIES_BY_ROUND) {
    for (const [seat, entry] of entries.entries()) {
      if (entry === null) continue;
      const bonuses = { ...NO_BONUS, ...entry.bonuses };
      await sql`INSERT INTO round_entry (game_id, round_number, player_id, bid, is_missed,
        tricks, standard_fourteen, black_fourteen, mermaid_by_pirate, pirate_by_skull_king,
        skull_king_by_mermaid, loot, updated_at)
        VALUES (${gameId}, ${roundNumber}, ${playerIds[seat] ?? ''}, ${entry.bid},
        ${entry.tricks !== undefined}, ${entry.tricks ?? null}, ${bonuses.standardFourteen}, ${bonuses.blackFourteen},
        ${bonuses.mermaidByPirate}, ${bonuses.pirateBySkullKing}, ${bonuses.skullKingByMermaid},
        ${bonuses.loot}, ${now})`;
    }
  }
}

async function prepareDevelopmentDatabase(): Promise<void> {
  await applyMigrations();
  const sql = postgres(process.env.DATABASE_URL ?? '', { max: 1, onnotice: () => undefined });
  try {
    await seedMidGame(sql, new Date());
  } finally {
    await sql.end({ timeout: 5 });
  }
  process.stdout.write(
    `[dev:db] migrations applied, game ${JOIN_CODE} seeded in round ${CURRENT_ROUND}, open /?game=${JOIN_CODE}\n`,
  );
}

await prepareDevelopmentDatabase();
