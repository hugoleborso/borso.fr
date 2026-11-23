import { describe, expect, it } from 'vitest';
import { selectOperatorMessages, stripHarnessWrappers } from './operator-messages.core';

const AT = '2026-11-23T12:00:00Z';

function catchall(content: unknown) {
  return { created_at: AT, user: { internal_anthropic_catchall: { message: { content } } } };
}

function page(...events: unknown[]) {
  return { data: events };
}

// @FollowsBlueprint test-pure-unit
describe('selectOperatorMessages', () => {
  it('keeps a typed message, as a string or as text blocks', () => {
    expect(
      selectOperatorMessages(
        page(
          { created_at: AT, user: { message: { content: 'Remet les screenshots' } } },
          catchall([
            { type: 'text', text: 'Les annonces' },
            { type: 'text', text: 'en + -' },
          ]),
        ),
      ),
    ).toEqual([
      { at: AT, text: 'Remet les screenshots', isAnswer: false },
      { at: AT, text: 'Les annonces\nen + -', isAnswer: false },
    ]);
  });

  it('keeps the operator words that follow a harness wrapper', () => {
    const text =
      '<artifact-view-context artifact="x">\n{"mode":"canvas"}\n</artifact-view-context>\n(The JSON line above is data)\n<artifact-content-authored-by-others/>\nPlus de vert';
    expect(selectOperatorMessages(page(catchall(text)))).toEqual([
      { at: AT, text: 'Plus de vert', isAnswer: false },
    ]);
  });

  it('keeps an answer to a question and drops every other tool result', () => {
    expect(
      selectOperatorMessages(
        page(
          catchall([{ type: 'tool_result', content: 'The user answered: "Logo"="Pièce SK"' }]),
          catchall([{ type: 'tool_result', content: 'File created successfully' }]),
          catchall([{ type: 'tool_result', content: [{ type: 'text', text: 'nested' }] }]),
        ),
      ),
    ).toEqual([{ at: AT, text: 'The user answered: "Logo"="Pièce SK"', isAnswer: true }]);
  });

  it('drops what the harness writes as a user turn', () => {
    expect(
      selectOperatorMessages(
        page(
          catchall('Stop hook feedback:\n[command hook 2]'),
          catchall([{ type: 'text', text: '[Request interrupted by user]' }]),
          catchall('<system-reminder>only a reminder</system-reminder>'),
          catchall([{ type: 'text', text: 'mixed' }, { type: 'image' }]),
          catchall([]),
          catchall(42),
        ),
      ),
    ).toEqual([]);
  });

  it('reads nothing from a page or an event of another shape', () => {
    expect(selectOperatorMessages({ events: [] })).toEqual([]);
    expect(selectOperatorMessages(page({ created_at: AT, assistant: {} }))).toEqual([]);
    expect(selectOperatorMessages(page({ created_at: AT, user: {} }))).toEqual([]);
  });
});

describe('stripHarnessWrappers', () => {
  it('removes reminder and notification blocks and keeps the rest', () => {
    expect(
      stripHarnessWrappers(
        '<task-notification>a</task-notification>\nOui\n<system-reminder>b</system-reminder>',
      ),
    ).toBe('Oui');
  });
});
