import { describe, expect, it } from 'vitest';
import {
  describeRecipients,
  findDraft,
  isDraftReady,
  partitionDrafts,
  selectDraftSheetIntents,
  selectChannelAppearance,
  selectDraftStatusAppearance,
  summarizeDraftBody,
} from './draft-board.core';

const ready = { slug: 'a', status: 'pret' };
const sent = { slug: 'b', status: 'envoye' };
const abandoned = { slug: 'c', status: 'abandonne' };

describe('partitionDrafts', () => {
  it('puts the ready drafts first and keeps the rest for the history, in order', () => {
    expect(partitionDrafts([sent, ready, abandoned])).toStrictEqual({
      ready: [ready],
      settled: [sent, abandoned],
    });
  });
});

describe('isDraftReady', () => {
  it('knows a draft is ready only from its status', () => {
    expect(isDraftReady('pret')).toBe(true);
    expect(isDraftReady('envoye')).toBe(false);
  });
});

describe('selectChannelAppearance', () => {
  it('gives each channel its icon and name, and a fallback for the others', () => {
    expect(selectChannelAppearance('gmail')).toEqual({
      icon: 'mail',
      labelKey: 'drafts.channel.gmail',
    });
    expect(selectChannelAppearance('slack').icon).toBe('hash');
    expect(selectChannelAppearance('linkedin').icon).toBe('briefcase');
    expect(selectChannelAppearance('whatsapp').icon).toBe('phone');
    expect(selectChannelAppearance('imessage').icon).toBe('smartphone');
    expect(selectChannelAppearance('autre')).toEqual({
      icon: 'send',
      labelKey: 'drafts.channel.other',
    });
  });
});

describe('selectDraftStatusAppearance', () => {
  it('names and colours each status, and an unknown one plainly', () => {
    expect(selectDraftStatusAppearance('pret')).toEqual({
      labelKey: 'drafts.status.ready',
      tone: 'bronze',
    });
    expect(selectDraftStatusAppearance('envoye')).toEqual({
      labelKey: 'drafts.status.sent',
      tone: 'success',
    });
    expect(selectDraftStatusAppearance('abandonne')).toEqual({
      labelKey: 'drafts.status.abandoned',
      tone: 'neutral',
    });
    expect(selectDraftStatusAppearance('brouillon')).toEqual({
      labelKey: 'drafts.status.other',
      tone: 'outline',
    });
  });
});

describe('summarizeDraftBody', () => {
  it('folds the text onto one line', () => {
    expect(summarizeDraftBody('  Bonjour Alice,\n\nOn se voit ?  ')).toBe(
      'Bonjour Alice, On se voit ?',
    );
  });
});

describe('findDraft', () => {
  it('finds a draft by its slug, or nothing', () => {
    expect(findDraft([ready, sent], 'b')).toBe(sent);
    expect(findDraft([ready, sent], 'z')).toBeNull();
  });
});

describe('describeRecipients', () => {
  it('joins the names of the recipients', () => {
    expect(describeRecipients([{ name: 'Alice' }, { name: 'Bruno' }])).toBe('Alice, Bruno');
  });
});

describe('selectDraftSheetIntents', () => {
  it('offers to copy, to open the link when there is one, and to settle a ready draft', () => {
    expect(selectDraftSheetIntents({ status: 'pret', link: 'https://x' })).toEqual([
      'copy',
      'open-link',
      'sent',
      'abandon',
    ]);
    expect(selectDraftSheetIntents({ status: 'envoye' })).toEqual(['copy']);
  });
});
