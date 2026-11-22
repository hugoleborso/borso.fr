import { describe, expect, it } from 'vitest';
import { countVisibleWords, selectWordyArtboards } from './mockup-copy.core';

const WORDY_SCREEN = `<x-dc><helmet><style>body{margin:0}</style></helmet>
<p>Tout le monde a réussi par défaut. Touchez seulement ceux qui ont raté.</p>
<button aria-label="Valider la manche"><svg><path d="M5 12l5 5"></path><title>coche</title></svg></button>
</x-dc><script>class Component { renderVals() { return { label: 'beaucoup de mots ici' }; } }</script>`;

// @FollowsBlueprint test-pure-unit
describe('countVisibleWords', () => {
  it('counts the words a person reads and nothing a browser hides', () => {
    expect(countVisibleWords(WORDY_SCREEN)).toBe(13);
  });

  it('counts no word in numbers, template holes or entities', () => {
    expect(countVisibleWords('<span>{{p.points}}</span><b>+40</b> 5&nbsp;/&nbsp;5')).toBe(0);
  });

  it('keeps two words apart when a hidden block, a hole, a tag or an entity sits between them', () => {
    expect(countVisibleWords('un<style>b{}</style>deux')).toBe(2);
    expect(countVisibleWords('un{{p.name}}deux')).toBe(2);
    expect(countVisibleWords('<b>un</b><i>deux</i>')).toBe(2);
    expect(countVisibleWords('un&nbsp;deux')).toBe(2);
  });

  it('counts a word with an apostrophe or a hyphen once', () => {
    expect(countVisibleWords("<p>l'ancre longue-vue</p>")).toBe(2);
  });
});

describe('selectWordyArtboards', () => {
  it('names only the artboards over the limit, with their count', () => {
    const artboards = [
      { path: 'project/Main.dc.html', html: '<p>Manche 5</p>' },
      { path: 'project/Resultats.dc.html', html: WORDY_SCREEN },
      { path: 'project/Pile.dc.html', html: '<p>un deux trois quatre cinq</p>' },
      { path: 'project/canvas.json', html: 'un deux trois quatre cinq six sept huit neuf dix' },
    ];
    expect(selectWordyArtboards(artboards, 5)).toEqual([
      { path: 'project/Resultats.dc.html', words: 13 },
    ]);
  });
});
