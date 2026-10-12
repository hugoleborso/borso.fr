import { describe, expect, it } from 'vitest';
import { notifySchema } from './notify.schema';

describe('notifySchema', () => {
  it('accepts what scripts/notifier.sh sends', () => {
    expect(
      notifySchema.parse({ title: ' Brief ', message: 'Prêt', urgent: true, url: '/aujourdhui' }),
    ).toEqual({ title: 'Brief', message: 'Prêt', urgent: true, url: '/aujourdhui' });
  });

  it.each([
    ['an empty title', { title: ' ', message: 'x' }],
    ['a title too long', { title: 'x'.repeat(201), message: 'x' }],
    ['an empty message', { title: 'x', message: '' }],
    ['a message too long', { title: 'x', message: 'x'.repeat(2001) }],
    ['an address outside the site', { title: 'x', message: 'x', url: 'https://ailleurs.fr' }],
    ['a protocol-relative address', { title: 'x', message: 'x', url: '//ailleurs.fr' }],
    ['an address too long', { title: 'x', message: 'x', url: `/${'x'.repeat(500)}` }],
  ])('refuses %s', (_label, candidate) => {
    expect(notifySchema.safeParse(candidate).success).toBe(false);
  });

  it('accepts texts exactly as long as allowed', () => {
    expect(
      notifySchema.safeParse({
        title: 'x'.repeat(200),
        message: 'x'.repeat(2000),
        url: `/${'x'.repeat(499)}`,
      }).success,
    ).toBe(true);
  });
});
