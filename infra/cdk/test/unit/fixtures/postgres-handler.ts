import postgres from 'postgres';

const sql = postgres();

export const handler = async () => sql`select 1`;
