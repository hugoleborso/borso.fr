import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { openScreen } from '@/navigation/navigation.store';
import { reviewMachine } from '@/review/review-machine.setup';
import { OpeningTrainerPage } from './OpeningTrainerPage';

const BOARD_SQUARE_PX = 40;

export function stubDecksFetch(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        url === '/decks.json' ? Response.json(body) : new Response('', { status: 404 }),
      ),
    ),
  );
}

export function stubBoardGeometry(): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, BOARD_SQUARE_PX, BOARD_SQUARE_PX),
  );
}

export async function openApplication(): Promise<void> {
  openScreen({ kind: 'today' });
  await act(async () => {
    render(<OpeningTrainerPage />);
    await Promise.resolve();
  });
  await screen.findByRole('button', { name: /^(Start|Commencer|Reload|Recharger)$/ });
}

export function playMove(uci: string): void {
  act(() => {
    reviewMachine.playMove(uci);
  });
}

export function readCount(label: string): string | null {
  return screen.getByText(label).nextElementSibling?.textContent ?? null;
}
