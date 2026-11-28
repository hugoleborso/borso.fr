import { describe, expect, it } from 'vitest';

import {
  digestSynthesizedOutput,
  isDeployedFile,
  listAppsWhoseDigestDiffers,
} from './synthesized-output.core';

const TEMPLATE = { name: 'pragma-prod.template.json', content: '{"Resources":{}}' };
const ASSETS = { name: 'pragma-prod.assets.json', content: '{"files":{"abc":{}}}' };
const METADATA = { name: 'pragma-prod.metadata.json', content: '{"path":"/home/a"}' };
const TREE = { name: 'tree.json', content: '{"path":"/home/a"}' };

describe('isDeployedFile', () => {
  it.each(['pragma-prod.template.json', 'pragma-cluster.assets.json'])('keeps %s', (name) => {
    expect(isDeployedFile(name)).toBe(true);
  });

  it.each(['manifest.json', 'tree.json', 'pragma-prod.metadata.json', 'validation-report.json'])(
    'ignores %s, which records where the synthesis ran rather than what deploys',
    (name) => {
      expect(isDeployedFile(name)).toBe(false);
    },
  );
});

describe('digestSynthesizedOutput', () => {
  it('ignores the files that change with the checkout path', () => {
    const elsewhere = [
      TEMPLATE,
      ASSETS,
      { ...METADATA, content: '{"path":"/tmp/b"}' },
      { ...TREE, content: '{"path":"/tmp/b"}' },
    ];

    expect(digestSynthesizedOutput(elsewhere)).toBe(
      digestSynthesizedOutput([TEMPLATE, ASSETS, METADATA, TREE]),
    );
  });

  it('does not depend on the order the directory lists the files in', () => {
    expect(digestSynthesizedOutput([ASSETS, TEMPLATE])).toBe(
      digestSynthesizedOutput([TEMPLATE, ASSETS]),
    );
  });

  it('changes when an asset hash in the template changes', () => {
    const rebuilt = { ...TEMPLATE, content: '{"Resources":{"Fn":{"S3Key":"def.zip"}}}' };

    expect(digestSynthesizedOutput([rebuilt, ASSETS])).not.toBe(
      digestSynthesizedOutput([TEMPLATE, ASSETS]),
    );
  });

  it('tells a moved byte between two files from no change at all', () => {
    const left = [
      { name: 'a.template.json', content: 'xy' },
      { name: 'b.template.json', content: 'z' },
    ];
    const right = [
      { name: 'a.template.json', content: 'x' },
      { name: 'b.template.json', content: 'yz' },
    ];

    expect(digestSynthesizedOutput(left)).not.toBe(digestSynthesizedOutput(right));
  });

  it('answers null for a synthesis that wrote no stack', () => {
    expect(digestSynthesizedOutput([TREE, METADATA])).toBeNull();
  });
});

describe('listAppsWhoseDigestDiffers', () => {
  const apps = ['borso-fr', 'pragma', 'talos', 'skull-king'];
  const base = new Map([
    ['borso-fr', 'same'],
    ['pragma', 'old'],
    ['talos', null],
    ['skull-king', 'kept'],
  ]);
  const head = new Map([
    ['borso-fr', 'same'],
    ['pragma', 'new'],
    ['talos', 'built'],
    ['skull-king', null],
  ]);

  it('keeps an app whose digest moved and one that failed to synthesize on either side', () => {
    expect(listAppsWhoseDigestDiffers(apps, base, head)).toEqual(['pragma', 'talos', 'skull-king']);
  });

  it('keeps an app neither side has a digest for', () => {
    expect(listAppsWhoseDigestDiffers(['banana-rush'], base, head)).toEqual(['banana-rush']);
  });
});
