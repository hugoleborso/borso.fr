/**
 * Front-end re-export of `domain/tonality.core.ts`. The core module is
 * pure and lives in `api/src/`; this bridge avoids pulling the rest of
 * the api tree (database, hono, etc.) into the bundler graph.
 */

export { deriveTonality } from '@api/songs/tonality.core';
