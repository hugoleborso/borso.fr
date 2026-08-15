import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { usePaginatedList } from './usePaginatedList';

const PAGE_SIZE = 2;

/**
 * @Blueprint test-hook-probe
 * @BlueprintName Hook Probe Component
 * @BlueprintUsage Use to drive a custom hook from a test without pulling in a hook testing library.
 * @BlueprintDescription Declares a throwaway component in the test file that calls the hook and publishes each returned value into the tree, rendering the list through real elements and the scalar through a test identifier. The test then asserts by querying the rendered output and advances the hook by clicking the button wired to its callback, so it exercises the hook the way a component does. Remount behaviour is covered by rerendering the probe under a different `key`, which is the only way to assert state that resets by remounting rather than by an effect.
 */
function PaginatedNames({ names }: { names: string[] }) {
  const { visibleItems, hasMore, loadMore } = usePaginatedList(names, PAGE_SIZE);
  return (
    <div>
      <ul>
        {visibleItems.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <span data-testid="has-more">{String(hasMore)}</span>
      <button type="button" onClick={loadMore}>
        Load more
      </button>
    </div>
  );
}

const NAMES = ['italian', 'ruy-lopez', 'sicilian', 'french'];

describe('usePaginatedList', () => {
  it('shows only the first page', () => {
    render(<PaginatedNames names={NAMES} />);
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'italian',
      'ruy-lopez',
    ]);
    expect(screen.getByTestId('has-more').textContent).toBe('true');
  });

  it('shows one more page each time the user asks for more', async () => {
    render(<PaginatedNames names={NAMES} />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByTestId('has-more').textContent).toBe('false');
  });

  it('reports no more pages when the list fits on one', () => {
    render(<PaginatedNames names={['italian']} />);
    expect(screen.getByTestId('has-more').textContent).toBe('false');
  });

  it('starts again at the first page when the owner is remounted under a new key', async () => {
    const { rerender } = render(<PaginatedNames key="openings" names={NAMES} />);
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    rerender(<PaginatedNames key="variations" names={NAMES} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
