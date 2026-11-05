import rule from './no-request-fan-out-in-site.js';
import { createRuleTester } from './rule-tester.js';

const DANTOTSU_PRELOAD = `
  async function preload(queryClient, ids) {
    await Promise.allSettled([
      queryClient.query(songsListQueryOptions()),
      ...ids.map((id) => queryClient.query(songQueryOptions(id))),
    ]);
  }`;

const MAP_OVER_QUERY = `
  export function preloadSongs(queryClient, ids) {
    return Promise.all(ids.map((id) => queryClient.query(songQueryOptions(id))));
  }`;

const GET_IN_FLAT_MAP = `
  export function readTakes(sessions) {
    return sessions.flatMap((session) => [api.api.takes[':id'].$get({ param: { id: session.id } })]);
  }`;

const SAME_FILE_HELPER_IN_MAP = `
  async function readSong(id) {
    const response = await api.api.songs[':id'].$get({ param: { id } });
    return response.json();
  }
  export function readSongs(ids) {
    return Promise.all(ids.map((id) => readSong(id)));
  }`;

const SAME_FILE_HELPER_PASSED_TO_MAP = `
  export function readSongs(ids) {
    return Promise.all(ids.map(readSong));
  }
  const readSong = async (id) => api.api.songs[':id'].$get({ param: { id } });`;

const QUERY_OPTIONS_FACTORY_IN_MAP = `
  function entriesQueryOptions(setlistId) {
    return queryOptions({
      queryKey: ['entries', setlistId],
      queryFn: () => api.api.setlists[':id'].entries.$get({ param: { id: setlistId } }),
    });
  }
  export function entriesOfSetlists(setlistIds) {
    return setlistIds.map((setlistId) => entriesQueryOptions(setlistId));
  }`;

const ARRAY_FROM_FETCH = `
  export function readPages(count) {
    return Array.from({ length: count }, (_, page) => fetch(pageUrl(page)));
  }`;

const USE_QUERIES_OVER_MAP = `
  export function useSongs(ids) {
    return useQueries({ queries: ids.map((id) => songQueryOptions(id)) });
  }`;

const USE_SUSPENSE_QUERIES_OVER_MAP = `
  export function useSongs(ids) {
    return useSuspenseQueries({ queries: ids.map((id) => songQueryOptions(id)) });
  }`;

const GET_AWAITED_IN_FOR_OF = `
  export async function readSongs(ids) {
    const songs = [];
    for (const id of ids) {
      const response = await api.api.songs[':id'].$get({ param: { id } });
      songs.push(await response.json());
    }
    return songs;
  }`;

const FETCH_QUERY_AWAITED_IN_WHILE = `
  export async function readPages(queryClient) {
    let page = 0;
    while (page < LAST_PAGE) {
      await queryClient.fetchQuery(pageQueryOptions(page));
      page += 1;
    }
  }`;

const SAME_FILE_READ_AWAITED_IN_FOR = `
  async function readSong(id) {
    return api.api.songs[':id'].$get({ param: { id } });
  }
  export async function readSongs(ids) {
    for (let index = 0; index < ids.length; index += 1) {
      await readSong(ids[index]);
    }
  }`;

const QUERY_AWAITED_IN_DO_WHILE = `
  export async function readUntilEmpty(queryClient) {
    let cursor = null;
    do {
      cursor = await queryClient.query(pageQueryOptions(cursor));
    } while (cursor !== null);
  }`;

const LITERAL_PAIR_OF_INVALIDATIONS = `
  export async function refresh(queryClient) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: votingKeys.all }),
      queryClient.invalidateQueries({ queryKey: setlistKeys.all }),
    ]);
  }`;

const LITERAL_PAIR_OF_READS = `
  export function readLists(queryClient) {
    return Promise.all([
      queryClient.query(songsListQueryOptions()),
      queryClient.query(sessionsListQueryOptions()),
    ]);
  }`;

const CACHE_DELETION = `
  export async function clearCaches() {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }`;

const DELETE_AWAITED_IN_LOOP = `
  export async function deleteTakes(ids) {
    for (const id of ids) {
      await api.api.takes[':id'].$delete({ param: { id } });
    }
  }`;

const INVALIDATION_IN_MAP = `
  export function refreshAll(queryClient, keys) {
    return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }`;

const HANDLER_IN_MAPPED_JSX = `
  export function TakeList({ takes }) {
    return takes.map((take) => (
      <TakeRow key={take.id} onDelete={() => api.api.takes[':id'].$delete({ param: { id: take.id } })} />
    ));
  }`;

const READ_IN_LOOP_INSIDE_A_DEFERRED_FUNCTION = `
  export function scheduleReads(ids) {
    const reads = [];
    for (const id of ids) {
      reads.push(async () => await api.api.songs[':id'].$get({ param: { id } }));
    }
    return reads;
  }`;

const BACK_END_FAN_OUT = {
  code: MAP_OVER_QUERY,
  filename: 'apps/pragma/api/src/read-batch/read-batch.service.ts',
};

const ruleTester = createRuleTester();

ruleTester.run('no-request-fan-out-in-site', rule, {
  valid: [
    LITERAL_PAIR_OF_INVALIDATIONS,
    LITERAL_PAIR_OF_READS,
    CACHE_DELETION,
    DELETE_AWAITED_IN_LOOP,
    INVALIDATION_IN_MAP,
    HANDLER_IN_MAPPED_JSX,
    READ_IN_LOOP_INSIDE_A_DEFERRED_FUNCTION,
    BACK_END_FAN_OUT,
  ],
  invalid: [
    { code: DANTOTSU_PRELOAD, errors: [{ messageId: 'requestFanOut' }] },
    { code: MAP_OVER_QUERY, errors: [{ messageId: 'requestFanOut' }] },
    { code: GET_IN_FLAT_MAP, errors: [{ messageId: 'requestFanOut' }] },
    { code: SAME_FILE_HELPER_IN_MAP, errors: [{ messageId: 'requestFanOut' }] },
    { code: SAME_FILE_HELPER_PASSED_TO_MAP, errors: [{ messageId: 'requestFanOut' }] },
    { code: QUERY_OPTIONS_FACTORY_IN_MAP, errors: [{ messageId: 'requestFanOut' }] },
    { code: ARRAY_FROM_FETCH, errors: [{ messageId: 'requestFanOut' }] },
    { code: USE_QUERIES_OVER_MAP, errors: [{ messageId: 'requestFanOut' }] },
    { code: USE_SUSPENSE_QUERIES_OVER_MAP, errors: [{ messageId: 'requestFanOut' }] },
    { code: GET_AWAITED_IN_FOR_OF, errors: [{ messageId: 'readAwaitedInLoop' }] },
    { code: FETCH_QUERY_AWAITED_IN_WHILE, errors: [{ messageId: 'readAwaitedInLoop' }] },
    { code: SAME_FILE_READ_AWAITED_IN_FOR, errors: [{ messageId: 'readAwaitedInLoop' }] },
    { code: QUERY_AWAITED_IN_DO_WHILE, errors: [{ messageId: 'readAwaitedInLoop' }] },
  ],
});
