import { describe, expect, it } from 'vitest';
import {
  changeOfGraphs,
  changeOfNodes,
  filePathOfLocation,
  statusOfNode,
} from './journey-status.core';

const COMPONENT = 'apps/pragma/site/src/components/organisms/SetlistEntryRow.tsx';
const CORE = 'apps/pragma/site/src/components/molecules/member-lineup.core.ts';
const UNTOUCHED = 'apps/pragma/site/src/components/atoms/Icon.tsx';

const STATUSES = new Map<string, string>([
  [COMPONENT, 'changed'],
  [CORE, 'added'],
]);

describe('filePathOfLocation', () => {
  it('keeps a location that is already a path', () => {
    expect(filePathOfLocation(COMPONENT)).toBe(COMPONENT);
  });

  it('drops the line number a symbol location carries', () => {
    expect(filePathOfLocation(`${COMPONENT}:118`)).toBe(COMPONENT);
  });

  it('leaves a path whose last segment merely contains a colon-like word alone', () => {
    expect(filePathOfLocation('apps/pragma/api/src/songs/songs.controller.ts:7:9')).toBe(
      'apps/pragma/api/src/songs/songs.controller.ts:7',
    );
  });

  it('reads a node with no location as no path', () => {
    expect(filePathOfLocation(undefined)).toBe('');
  });
});

describe('statusOfNode', () => {
  it('finds the status of a node whose location carries no line number', () => {
    expect(statusOfNode(COMPONENT, STATUSES)).toBe('changed');
  });

  it('finds the status of a node whose location carries a line number', () => {
    expect(statusOfNode(`${CORE}:44`, STATUSES)).toBe('added');
  });

  it('reads an untouched file as no status', () => {
    expect(statusOfNode(UNTOUCHED, STATUSES)).toBe('');
  });

  it('reads a node with no location as no status', () => {
    expect(statusOfNode(undefined, STATUSES)).toBe('');
  });

  it('reads every node as unchanged when the page is not a diff', () => {
    expect(statusOfNode(COMPONENT, undefined)).toBe('');
  });

  it('refuses a status word the diff never produces', () => {
    expect(statusOfNode(COMPONENT, new Map([[COMPONENT, 'rewritten']]))).toBe('');
  });

  it('refuses a status word inherited from the object prototype', () => {
    expect(statusOfNode(COMPONENT, new Map([[COMPONENT, 'constructor']]))).toBe('');
  });
});

describe('changeOfNodes', () => {
  it('reports the strongest status among the nodes and how many files moved', () => {
    expect(changeOfNodes([{ location: COMPONENT }, { location: `${CORE}:44` }], STATUSES)).toEqual({
      status: 'added',
      touched: 2,
    });
  });

  it('counts a file once however many nodes sit in it', () => {
    expect(
      changeOfNodes([{ location: COMPONENT }, { location: `${COMPONENT}:12` }], STATUSES),
    ).toEqual({ status: 'changed', touched: 1 });
  });

  it('counts only the files that moved when untouched ones sit beside them', () => {
    expect(changeOfNodes([{ location: UNTOUCHED }, { location: COMPONENT }, {}], STATUSES)).toEqual(
      { status: 'changed', touched: 1 },
    );
  });

  it('reads a journey touching nothing as unchanged', () => {
    expect(changeOfNodes([{ location: UNTOUCHED }, {}], STATUSES)).toEqual({
      status: '',
      touched: 0,
    });
  });

  it('reads every journey as unchanged when the page is not a diff', () => {
    expect(changeOfNodes([{ location: COMPONENT }], undefined)).toEqual({
      status: '',
      touched: 0,
    });
  });

  it('ranks a change above a move', () => {
    const statuses = new Map<string, string>([
      [COMPONENT, 'changed'],
      [UNTOUCHED, 'moved'],
    ]);
    expect(changeOfNodes([{ location: UNTOUCHED }, { location: COMPONENT }], statuses)).toEqual({
      status: 'changed',
      touched: 2,
    });
  });

  it('ranks a removal above a move and below a change', () => {
    const statuses = new Map<string, string>([
      [COMPONENT, 'removed'],
      [UNTOUCHED, 'moved'],
    ]);
    expect(changeOfNodes([{ location: COMPONENT }, { location: UNTOUCHED }], statuses)).toEqual({
      status: 'removed',
      touched: 2,
    });
  });
});

describe('changeOfGraphs', () => {
  it('counts a file shared by two actions once for the feature', () => {
    expect(
      changeOfGraphs([[{ location: COMPONENT }], [{ location: COMPONENT }]], STATUSES),
    ).toEqual({ status: 'changed', touched: 1 });
  });

  it('takes the strongest status across every action of the feature', () => {
    expect(changeOfGraphs([[{ location: COMPONENT }], [{ location: CORE }]], STATUSES)).toEqual({
      status: 'added',
      touched: 2,
    });
  });

  it('counts only the files that moved across the actions of the feature', () => {
    expect(changeOfGraphs([[{ location: UNTOUCHED }], [{ location: CORE }]], STATUSES)).toEqual({
      status: 'added',
      touched: 1,
    });
  });

  it('reads a feature whose actions touch nothing as unchanged', () => {
    expect(changeOfGraphs([[{ location: UNTOUCHED }], []], STATUSES)).toEqual({
      status: '',
      touched: 0,
    });
  });

  it('reads every feature as unchanged when the page is not a diff', () => {
    expect(changeOfGraphs([[{ location: COMPONENT }]], undefined)).toEqual({
      status: '',
      touched: 0,
    });
  });
});
