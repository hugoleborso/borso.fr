import { randomUUID } from 'node:crypto';
import { getDatabase } from '../../api/src/database/client';
import { createImprovement } from '../../api/src/improvements/improvements.service';
import {
  createInstrument,
  getInstrumentsSorted,
} from '../../api/src/instruments/instruments.service';
import { saveMasteryDefault, saveMasteryOverride } from '../../api/src/mastery/mastery.service';
import {
  assignInstrumentsToMember,
  createMember,
  getMembersSortedByFirstName,
} from '../../api/src/members/members.service';
import { createCredentialForMember } from '../../api/src/auth/credentials.service';
import { createSession, getSessions } from '../../api/src/sessions/sessions.service';
import {
  appendEntry,
  createSetlist,
  getAllSetlists,
  getEntries,
} from '../../api/src/setlists/setlists.service';
import { createSong, getSongs } from '../../api/src/songs/songs.service';
import { logStudy } from '../../api/src/studies/studies.service';
import { createTake, createTakeComment } from '../../api/src/takes/takes.service';
import { buildTakeObjectKey } from '../../api/src/takes/takes.core';
import { createTask } from '../../api/src/tasks/tasks.service';
import { saveTransitionComment } from '../../api/src/transitions/transitions.service';

const DAY = 24 * 60 * 60 * 1000;
const HIGH_ENERGY_EVERY = 4;
const HIGH_ENERGY = 9;
const WONDERWALL_CAPO = 2;
const CONCERT_NOTE_EVERY = 5;
const PRACTICE_IN_DAYS = 3;
const PAST_PRACTICE_DAYS_AGO = 4;
const REHEARSAL_NOTE_EVERY = 3;
const FESTIVAL_SONG_COUNT = 22;
const FIRST_SONG_TAKE_COUNT = 3;
const TAKE_SPACING_MS = 600_000;
const TAKE_BASE_DURATION_SECONDS = 180;
const TAKE_DURATION_STEP_SECONDS = 20;
const PASSWORD = 'pragma-preview';
const now = new Date();

type Lineup = Record<string, string[]>;
interface ExtraSong {
  title: string;
  artist: string;
  status: 'idea' | 'wip' | 'rehearsed' | 'concert_ready';
  origin: 'cover' | 'original';
  key: string | null;
  energy: number;
  lineup: Lineup;
  chords?: string;
  structure?: string;
  gimmick?: string;
  notes?: string;
}

const FULL: Lineup = {
  Hugo: ['Batterie'],
  Léa: ['Guitare', 'Chant'],
  Marc: ['Basse'],
  Sarah: ['Clavier'],
};
const WITH_SAX: Lineup = { ...FULL, Tom: ['Saxophone'] };
const ACOUSTIC: Lineup = { Léa: ['Guitare', 'Chant'], Sarah: ['Clavier', 'Chant'] };
const SARAH_SINGS: Lineup = {
  Hugo: ['Batterie'],
  Léa: ['Guitare'],
  Marc: ['Basse'],
  Sarah: ['Clavier', 'Chant'],
};

const chart = (title: string, key: string, body: string): string =>
  `{title: ${title}}\n{key: ${key}}\n${body}`;

const EXTRA_SONGS: ExtraSong[] = [
  {
    title: 'Superstition',
    artist: 'Stevie Wonder',
    status: 'concert_ready',
    origin: 'cover',
    key: 'Ebm',
    energy: 8,
    lineup: WITH_SAX,
    chords: chart(
      'Superstition',
      'Ebm',
      "{start_of_verse}\n[Ebm7]Very superstitious, writing's on the wall\n[Ebm7]Very superstitious, ladder's 'bout to fall\n{end_of_verse}\n{start_of_chorus}\n[B7]When you believe in [Bb7]things that you don't understand\n{end_of_chorus}",
    ),
    structure: 'riff clavier ×2 · couplet · couplet · refrain · solo sax · refrain',
    gimmick: 'Sarah lance le riff seule, la batterie entre à la 3e mesure.',
  },
  {
    title: 'Valerie',
    artist: 'Amy Winehouse',
    status: 'concert_ready',
    origin: 'cover',
    key: 'Eb',
    energy: 7,
    lineup: SARAH_SINGS,
    notes: 'Tempo plus rapide que la version Zutons.',
  },
  {
    title: 'Seven Nation Army',
    artist: 'The White Stripes',
    status: 'concert_ready',
    origin: 'cover',
    key: 'Em',
    energy: 9,
    lineup: FULL,
    chords: chart(
      'Seven Nation Army',
      'Em',
      "{start_of_verse}\n[Em]I'm gonna fight 'em off\n[Em]A seven nation army couldn't hold me back\n{end_of_verse}\n{start_of_chorus}\n[G]And I'm [A]talking to myself at night\n{end_of_chorus}",
    ),
  },
  {
    title: "Le Temps de l'amour",
    artist: 'Françoise Hardy',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Am',
    energy: 5,
    lineup: FULL,
  },
  {
    title: 'Get Lucky',
    artist: 'Daft Punk',
    status: 'concert_ready',
    origin: 'cover',
    key: 'F#m',
    energy: 7,
    lineup: FULL,
    gimmick: 'Vocoder sur le dernier refrain si le clavier suit.',
  },
  {
    title: 'Lose Yourself to Dance',
    artist: 'Daft Punk',
    status: 'wip',
    origin: 'cover',
    key: 'Bm',
    energy: 6,
    lineup: FULL,
  },
  {
    title: 'Crazy in Love',
    artist: 'Beyoncé',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Dm',
    energy: 8,
    lineup: { ...SARAH_SINGS, Tom: ['Saxophone'] },
  },
  {
    title: 'Respect',
    artist: 'Aretha Franklin',
    status: 'concert_ready',
    origin: 'cover',
    key: 'C',
    energy: 8,
    lineup: SARAH_SINGS,
  },
  {
    title: 'I Want You Back',
    artist: 'The Jackson 5',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Ab',
    energy: 8,
    lineup: FULL,
  },
  {
    title: 'Dreams',
    artist: 'Fleetwood Mac',
    status: 'rehearsed',
    origin: 'cover',
    key: 'F',
    energy: 4,
    lineup: ACOUSTIC,
    chords: chart(
      'Dreams',
      'F',
      "{start_of_verse}\n[F]Now here you go again, you say you [G]want your freedom\n{end_of_verse}\n{start_of_chorus}\n[F]Thunder only happens when it's [G]raining\n{end_of_chorus}",
    ),
  },
  {
    title: 'Hit the Road Jack',
    artist: 'Ray Charles',
    status: 'concert_ready',
    origin: 'cover',
    key: 'Am',
    energy: 7,
    lineup: { ...FULL, Sarah: ['Clavier', 'Chant'] },
  },
  {
    title: 'Feeling Good',
    artist: 'Nina Simone',
    status: 'wip',
    origin: 'cover',
    key: 'Gm',
    energy: 5,
    lineup: WITH_SAX,
  },
  {
    title: 'Psycho Killer',
    artist: 'Talking Heads',
    status: 'rehearsed',
    origin: 'cover',
    key: 'A',
    energy: 7,
    lineup: FULL,
  },
  {
    title: 'Les Champs-Élysées',
    artist: 'Joe Dassin',
    status: 'idea',
    origin: 'cover',
    key: null,
    energy: 5,
    lineup: {},
  },
  {
    title: 'Rolling in the Deep',
    artist: 'Adele',
    status: 'concert_ready',
    origin: 'cover',
    key: 'Cm',
    energy: 7,
    lineup: SARAH_SINGS,
  },
  {
    title: 'Sweet Dreams (Are Made of This) — Extended Version With the Long Synth Intro',
    artist: 'Eurythmics',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Cm',
    energy: 6,
    lineup: SARAH_SINGS,
    structure: 'intro synth ×8 · couplet · couplet · pont · couplet ×2 · outro',
  },
  {
    title: "Quand la ville dort encore et que les réverbères s'éteignent un par un",
    artist: 'Pragma',
    status: 'wip',
    origin: 'original',
    key: 'D',
    energy: 3,
    lineup: ACOUSTIC,
    notes: 'Paroles de Léa, deuxième couplet à réécrire.',
  },
  {
    title: 'Back to Black',
    artist: 'Amy Winehouse',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Dm',
    energy: 4,
    lineup: SARAH_SINGS,
  },
  {
    title: 'Uptown Funk',
    artist: 'Mark Ronson feat. Bruno Mars',
    status: 'concert_ready',
    origin: 'cover',
    key: 'Dm',
    energy: 10,
    lineup: WITH_SAX,
    gimmick: "Tout le monde s'arrête sur « Don't believe me just watch ».",
  },
  {
    title: 'Zombie',
    artist: 'The Cranberries',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Em',
    energy: 7,
    lineup: FULL,
    chords: chart(
      'Zombie',
      'Em',
      '{start_of_verse}\n[Em]Another head hangs [C]lowly\n[G]Child is slowly [D]taken\n{end_of_verse}\n{start_of_chorus}\n[Em]In your head, [C]in your head\n[G]Zombie, zombie, [D]zombie-ie-ie\n{end_of_chorus}',
    ),
  },
  {
    title: 'Take On Me',
    artist: 'a-ha',
    status: 'wip',
    origin: 'cover',
    key: 'A',
    energy: 8,
    lineup: FULL,
    notes: 'Le refrain est trop haut pour Léa, essayer en F#.',
  },
  {
    title: 'Nuit blanche à la station-service',
    artist: 'Pragma',
    status: 'rehearsed',
    origin: 'original',
    key: 'Bm',
    energy: 6,
    lineup: FULL,
    chords: chart(
      'Nuit blanche',
      'Bm',
      "{start_of_verse}\n[Bm]Néons qui grésillent, [G]café trop chaud\n[D]On attend l'aube [A]sur le capot\n{end_of_verse}\n{start_of_chorus}\n[G]Nuit [A]blanche, [Bm]nuit blanche\n{end_of_chorus}",
    ),
  },
  {
    title: 'Septembre',
    artist: 'Pragma',
    status: 'idea',
    origin: 'original',
    key: null,
    energy: 4,
    lineup: {},
    notes: "Juste une grille de Sarah pour l'instant.",
  },
  {
    title: 'Proud Mary',
    artist: 'Ike & Tina Turner',
    status: 'rehearsed',
    origin: 'cover',
    key: 'D',
    energy: 9,
    lineup: { ...FULL, Sarah: ['Clavier', 'Chant'] },
    structure: 'intro lente · bascule rapide après « rolling »',
  },
  {
    title: 'Wonderwall',
    artist: 'Oasis',
    status: 'concert_ready',
    origin: 'cover',
    key: 'F#m',
    energy: 5,
    lineup: FULL,
    chords: chart(
      'Wonderwall',
      'F#m',
      "{start_of_verse}\n[Em7]Today is [G]gonna be the day\n[Dsus4]That they're gonna throw it [A7sus4]back to you\n{end_of_verse}",
    ),
    notes: 'Capo 2.',
  },
  {
    title: 'Mr. Brightside',
    artist: 'The Killers',
    status: 'concert_ready',
    origin: 'cover',
    key: 'Db',
    energy: 9,
    lineup: FULL,
  },
  {
    title: "Ain't No Sunshine",
    artist: 'Bill Withers',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Am',
    energy: 3,
    lineup: ACOUSTIC,
  },
  {
    title: 'September',
    artist: 'Earth, Wind & Fire',
    status: 'concert_ready',
    origin: 'cover',
    key: 'A',
    energy: 9,
    lineup: WITH_SAX,
  },
  {
    title: 'Moi... Lolita',
    artist: 'Alizée',
    status: 'idea',
    origin: 'cover',
    key: null,
    energy: 6,
    lineup: {},
  },
  {
    title: 'Jolene',
    artist: 'Dolly Parton',
    status: 'wip',
    origin: 'cover',
    key: 'C#m',
    energy: 5,
    lineup: SARAH_SINGS,
  },
  {
    title: 'Come Together',
    artist: 'The Beatles',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Dm',
    energy: 5,
    lineup: FULL,
  },
  {
    title: 'Respire encore un peu',
    artist: 'Pragma',
    status: 'wip',
    origin: 'original',
    key: 'E',
    energy: 5,
    lineup: FULL,
    notes: 'Hugo a une maquette sur son téléphone.',
  },
  {
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    status: 'concert_ready',
    origin: 'cover',
    key: 'F#m',
    energy: 8,
    lineup: FULL,
  },
  {
    title: 'Hey Ya!',
    artist: 'OutKast',
    status: 'wip',
    origin: 'cover',
    key: 'G',
    energy: 9,
    lineup: FULL,
  },
  {
    title: 'La Javanaise',
    artist: 'Serge Gainsbourg',
    status: 'rehearsed',
    origin: 'cover',
    key: 'Bb',
    energy: 2,
    lineup: { ...ACOUSTIC, Tom: ['Saxophone'] },
  },
  {
    title: 'Should I Stay or Should I Go',
    artist: 'The Clash',
    status: 'concert_ready',
    origin: 'cover',
    key: 'D',
    energy: 9,
    lineup: FULL,
  },
  {
    title: 'Everybody Wants to Rule the World',
    artist: 'Tears for Fears',
    status: 'rehearsed',
    origin: 'cover',
    key: 'D',
    energy: 6,
    lineup: FULL,
  },
  {
    title: 'Kiss',
    artist: 'Prince',
    status: 'idea',
    origin: 'cover',
    key: null,
    energy: 7,
    lineup: {},
  },
];

const actorOf = (memberId: string) => ({ memberId, now });

function requireValue<Value>(value: Value | undefined, what: string): Value {
  if (value === undefined) throw new Error(`audit seed: no ${what}`);
  return value;
}

async function main(): Promise<void> {
  const saxophone = await createInstrument({
    name: 'Saxophone',
    family: 'harmonic',
    icon: 'brass',
  });
  const instruments = await getInstrumentsSorted();
  const instrumentId = new Map(instruments.map((row) => [row.name, row.id]));

  const tom = await createMember({ firstName: 'Tom', color: '#8a4fd1' });
  await createCredentialForMember({ memberId: tom.id, username: 'tom', password: PASSWORD, now });
  await assignInstrumentsToMember(tom.id, [saxophone.id], [saxophone.id]);
  const members = await getMembersSortedByFirstName();
  const memberId = new Map(members.map((row) => [row.firstName, row.id]));
  const hugo = requireValue(memberId.get('Hugo'), 'member Hugo');
  const lea = requireValue(memberId.get('Léa'), 'member Léa');
  const marc = requireValue(memberId.get('Marc'), 'member Marc');
  const sarah = requireValue(memberId.get('Sarah'), 'member Sarah');

  const toLineup = (byName: Lineup): Record<string, string[]> =>
    Object.fromEntries(
      Object.entries(byName).map(([name, list]) => [
        requireValue(memberId.get(name), `member ${name}`),
        list.map((instrument) =>
          requireValue(instrumentId.get(instrument), `instrument ${instrument}`),
        ),
      ]),
    );

  for (const song of EXTRA_SONGS) {
    const created = await createSong({
      title: song.title,
      artist: song.artist,
      status: song.status,
      origin: song.origin,
      links: [],
      chart: song.chords === undefined ? null : { kind: 'chordpro', text: song.chords },
      tonalityStart: song.key,
      tonalityEnd: null,
      defaultLineup: toLineup(song.lineup),
      baseEnergy: song.energy,
      deezerTrackId: null,
      deezerAlbumId: null,
      spotifyTrackId: null,
      album: null,
      durationSeconds: null,
      isrcs: [],
      tags: [],
      structureNotes: song.structure ?? '',
      gimmickNotes: song.gimmick ?? '',
      notes: song.notes ?? '',
    });
    if (created.kind !== 'ok') throw new Error(`song ${song.title} refused: ${created.kind}`);
  }
  const songs = await getSongs();
  const songId = new Map(songs.map((row) => [row.title, row.id]));
  const id = (title: string): string => {
    const found = songId.get(title);
    if (found === undefined) throw new Error(`no song ${title}`);
    return found;
  };

  const concertSetlist = requireValue(
    (await getAllSetlists()).find((row) => row.name === 'Set principal'),
    'setlist Set principal',
  );
  const concertAdditions = [
    'Superstition',
    'Valerie',
    'Seven Nation Army',
    'Get Lucky',
    'Respect',
    'Hit the Road Jack',
    'Rolling in the Deep',
    'Uptown Funk',
    'Wonderwall',
    'Mr. Brightside',
    'September',
    'Billie Jean',
    'Should I Stay or Should I Go',
    'Sweet Dreams (Are Made of This) — Extended Version With the Long Synth Intro',
  ];
  for (const [index, title] of concertAdditions.entries()) {
    await appendEntry(
      concertSetlist.id,
      {
        songId: id(title),
        energy: index % HIGH_ENERGY_EVERY === 0 ? HIGH_ENERGY : null,
        lineupOverride:
          title === 'Valerie' ? toLineup({ ...SARAH_SINGS, Tom: ['Saxophone'] }) : null,
        keyOverride: title === 'Wonderwall' ? 'Em' : null,
        capo: title === 'Wonderwall' ? WONDERWALL_CAPO : null,
        notes:
          title === 'Uptown Funk'
            ? 'Rappel : on finit le concert dessus si la salle est chaude.'
            : index % CONCERT_NOTE_EVERY === 0
              ? 'Enchaîner sans pause.'
              : '',
      },
      actorOf(hugo),
    );
  }

  const practice = await createSession(
    {
      kind: 'practice',
      date: new Date(now.getTime() + PRACTICE_IN_DAYS * DAY).toISOString(),
      preparedConcertId: null,
      origin: null,
    },
    actorOf(lea),
  );
  const pastPractice = await createSession(
    {
      kind: 'practice',
      date: new Date(now.getTime() - PAST_PRACTICE_DAYS_AGO * DAY).toISOString(),
      preparedConcertId: null,
      origin: null,
    },
    actorOf(lea),
  );
  const rehearsal = await createSetlist(
    { name: 'Répétition du jeudi — on cale les enchaînements', sessionId: practice.id },
    actorOf(lea),
  );
  if (rehearsal.kind !== 'ok') throw new Error('rehearsal setlist refused');
  const rehearsalTitles = [
    "Le Temps de l'amour",
    'Lose Yourself to Dance',
    'Crazy in Love',
    'I Want You Back',
    'Dreams',
    'Feeling Good',
    'Psycho Killer',
    'Back to Black',
    'Zombie',
    'Take On Me',
    'Nuit blanche à la station-service',
    'Proud Mary',
    'Jolene',
    'Come Together',
    'Respire encore un peu',
    'Hey Ya!',
    "Quand la ville dort encore et que les réverbères s'éteignent un par un",
  ];
  for (const [index, title] of rehearsalTitles.entries()) {
    await appendEntry(
      rehearsal.setlist.id,
      {
        songId: id(title),
        energy: null,
        lineupOverride: null,
        keyOverride: title === 'Take On Me' ? 'F#' : null,
        capo: null,
        notes:
          index % REHEARSAL_NOTE_EVERY === 0
            ? 'Travailler la fin, on ne sait jamais qui arrête.'
            : '',
      },
      actorOf(lea),
    );
  }

  const festival = await createSetlist(
    { name: 'Festival de la Butte — brouillon long', sessionId: null },
    actorOf(sarah),
  );
  if (festival.kind !== 'ok') throw new Error('festival setlist refused');
  for (const song of songs.filter((row) => row.status !== 'idea').slice(0, FESTIVAL_SONG_COUNT)) {
    await appendEntry(
      festival.setlist.id,
      {
        songId: song.id,
        energy: null,
        lineupOverride: null,
        keyOverride: null,
        capo: null,
        notes: '',
      },
      actorOf(sarah),
    );
  }

  const transitions: [string, string, string][] = [
    ['Superstition', 'Valerie', "Sarah garde l'accord de Ebm, Hugo enchaîne au charleston."],
    ['Get Lucky', 'Respect', "Coupure nette, Léa annonce pendant que Marc s'accorde."],
    ['Uptown Funk', 'Wonderwall', 'Pause de 20 secondes, changement de guitare.'],
    ['Dreams', 'Feeling Good', 'Tom entre seul au saxophone sur la dernière note.'],
    ['Zombie', 'Take On Me', 'Trop brutal, à discuter jeudi.'],
  ];
  for (const [from, to, comment] of transitions) {
    await saveTransitionComment(id(from), id(to), comment, actorOf(lea));
  }

  const takeSongs = [
    'Superstition',
    'Nuit blanche à la station-service',
    'Zombie',
    'Respire encore un peu',
    'Valerie',
  ];
  for (const [index, title] of takeSongs.entries()) {
    for (let attempt = 0; attempt < (index === 0 ? FIRST_SONG_TAKE_COUNT : 1); attempt += 1) {
      const takeId = randomUUID();
      const contentType = 'audio/mp4';
      const created = await createTake(
        {
          id: takeId,
          songId: id(title),
          sessionId: pastPractice.id,
          contentType,
          objectKey: buildTakeObjectKey({ songId: id(title), takeId, contentType }),
          recordedAt: new Date(
            now.getTime() - PAST_PRACTICE_DAYS_AGO * DAY + attempt * TAKE_SPACING_MS,
          ).toISOString(),
          durationSeconds: TAKE_BASE_DURATION_SECONDS + index * TAKE_DURATION_STEP_SECONDS,
          source: 'live',
          queued: false,
        },
        actorOf(hugo),
      );
      if (created.kind !== 'ok') throw new Error(`take refused: ${created.kind}`);
      await createTakeComment(
        takeId,
        { body: 'La basse décroche à 1:20, on retente.', atSeconds: 80 },
        actorOf(marc),
      );
      await createTakeComment(
        takeId,
        { body: 'Très bonne énergie sur le refrain.', atSeconds: null },
        actorOf(sarah),
      );
    }
  }

  const tasks = [
    {
      title: 'Apprendre la grille de Superstition au clavier',
      assignee: sarah,
      song: 'Superstition',
      status: 'doing',
      due: 2,
    },
    {
      title: 'Relever le solo de sax de Feeling Good',
      assignee: tom.id,
      song: 'Feeling Good',
      status: 'todo',
      due: 6,
    },
    {
      title: 'Choisir la tonalité de Take On Me',
      assignee: lea,
      song: 'Take On Me',
      status: 'todo',
      due: 3,
    },
    {
      title: 'Apporter la deuxième basse pour Zombie',
      assignee: marc,
      song: 'Zombie',
      status: 'todo',
      due: 7,
    },
    {
      title: "Envoyer la setlist à l'ingé son du Petit Bain",
      assignee: hugo,
      song: null,
      status: 'todo',
      due: 5,
    },
    {
      title: 'Écrire le deuxième couplet',
      assignee: lea,
      song: "Quand la ville dort encore et que les réverbères s'éteignent un par un",
      status: 'doing',
      due: 10,
    },
  ] as const;
  for (const task of tasks) {
    const outcome = await createTask({
      title: task.title,
      notes: '',
      status: task.status,
      assigneeId: task.assignee,
      songId: task.song === null ? null : id(task.song),
      dueDate: new Date(now.getTime() + task.due * DAY).toISOString(),
    });
    if (outcome.kind !== 'ok') throw new Error(`task refused: ${outcome.kind}`);
  }

  for (const [title, details, status] of [
    ['Pouvoir noter les enchaînements pendant la répète', 'Sans quitter la setlist.', 'idea'],
    ['Accords plus faciles à coller depuis un site', '', 'planned'],
    ["Voir qui joue quoi sur toute la setlist d'un coup", '', 'idea'],
  ] as const) {
    await createImprovement({ title, details, status }, lea, now);
  }

  for (const member of members) {
    for (const instrument of instruments) {
      await saveMasteryDefault({ memberId: member.id, instrumentId: instrument.id, score: 2 });
    }
  }
  for (const title of ['Superstition', 'Zombie', 'Valerie', 'Get Lucky']) {
    await saveMasteryOverride(
      {
        memberId: sarah,
        instrumentId: requireValue(instrumentId.get('Clavier'), 'instrument Clavier'),
        songId: id(title),
        score: 4,
      },
      now,
    );
    await logStudy({
      songId: id(title),
      instrumentId: requireValue(instrumentId.get('Clavier'), 'instrument Clavier'),
      memberId: sarah,
      now,
    });
  }

  const setlists = await getAllSetlists();
  const counts = await Promise.all(
    setlists.map(async (row) => `${row.name}: ${(await getEntries(row.id)).length}`),
  );
  process.stdout.write(
    `[audit-seed] songs=${songs.length} members=${members.length} instruments=${instruments.length} sessions=${(await getSessions()).length}\n`,
  );
  process.stdout.write(`[audit-seed] setlists -> ${counts.join(' | ')}\n`);
  await getDatabase().$client.end();
}

await main();
