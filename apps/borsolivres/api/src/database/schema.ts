/**
 * The one namespace `drizzle-kit` reads. Each table is declared inside the
 * slice that owns it and re-exported here, so a new table becomes visible to
 * migrations by adding one export line rather than by moving the declaration.
 */

// @FollowsBlueprint database-schema-barrel
export { bookTable } from '../books/books.schema';
export { shelfTable } from '../shelves/shelves.schema';
