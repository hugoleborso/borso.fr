export type ChangeStatus = 'added' | 'changed' | 'moved' | 'removed';

export interface JourneyChange {
  readonly status: ChangeStatus | '';
  readonly touched: number;
}

export interface LocatedNode {
  readonly location?: string;
}

const LINE_NUMBER_SUFFIX = /:\d+$/u;

const STATUS_STRENGTH: Readonly<Record<ChangeStatus, number>> = {
  added: 4,
  changed: 3,
  removed: 2,
  moved: 1,
};

const UNCHANGED: JourneyChange = { status: '', touched: 0 };

export function filePathOfLocation(location: string | undefined): string {
  if (location === undefined) return '';
  return location.replace(LINE_NUMBER_SUFFIX, '');
}

function isChangeStatus(candidate: string | undefined): candidate is ChangeStatus {
  return Object.hasOwn(STATUS_STRENGTH, String(candidate));
}

export function statusOfNode(
  location: string | undefined,
  statusByPath: ReadonlyMap<string, string> | undefined,
): ChangeStatus | '' {
  const status = statusByPath?.get(filePathOfLocation(location));
  return isChangeStatus(status) ? status : '';
}

function collectTouchedPaths(
  nodes: readonly LocatedNode[],
  statusByPath: ReadonlyMap<string, string> | undefined,
  into: Map<string, ChangeStatus>,
): void {
  for (const node of nodes) {
    const status = statusOfNode(node.location, statusByPath);
    if (status === '') continue;
    into.set(filePathOfLocation(node.location), status);
  }
}

function summarise(touchedByPath: ReadonlyMap<string, ChangeStatus>): JourneyChange {
  const strongest = [...touchedByPath.values()].sort(
    (left, right) => STATUS_STRENGTH[right] - STATUS_STRENGTH[left],
  )[0];
  return strongest === undefined ? UNCHANGED : { status: strongest, touched: touchedByPath.size };
}

export function changeOfNodes(
  nodes: readonly LocatedNode[],
  statusByPath: ReadonlyMap<string, string> | undefined,
): JourneyChange {
  const touchedByPath = new Map<string, ChangeStatus>();
  collectTouchedPaths(nodes, statusByPath, touchedByPath);
  return summarise(touchedByPath);
}

export function changeOfGraphs(
  graphs: readonly (readonly LocatedNode[])[],
  statusByPath: ReadonlyMap<string, string> | undefined,
): JourneyChange {
  const touchedByPath = new Map<string, ChangeStatus>();
  for (const nodes of graphs) collectTouchedPaths(nodes, statusByPath, touchedByPath);
  return summarise(touchedByPath);
}
