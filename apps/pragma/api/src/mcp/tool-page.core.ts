export interface PageRequest {
  readonly limit?: number | undefined;
  readonly cursor?: string | undefined;
}

export interface Page<Item> {
  readonly items: readonly Item[];
  readonly total: number;
  readonly nextCursor?: string;
}

const DECIMAL = 10;

function readOffset(cursor: string | undefined): number {
  const offset = Number.parseInt(String(cursor), DECIMAL);
  return Number.isNaN(offset) ? 0 : Math.max(offset, 0);
}

// @FollowsBlueprint core-decision
export function pageItems<Item>(
  items: readonly Item[],
  request: PageRequest,
  defaultLimit: number,
): Page<Item> {
  const offset = readOffset(request.cursor);
  const end = offset + (request.limit ?? defaultLimit);
  const page = { items: items.slice(offset, end), total: items.length };
  return end < items.length ? { ...page, nextCursor: String(end) } : page;
}
