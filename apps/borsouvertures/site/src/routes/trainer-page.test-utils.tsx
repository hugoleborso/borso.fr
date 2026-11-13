import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { openScreen } from '@/navigation/navigation.store';
import { reviewMachine } from '@/review/review-machine.setup';
import { OpeningTrainerPage } from './OpeningTrainerPage';

const BOARD_SQUARE_PX = 40;

const SMALL_OPENINGS_DOCUMENT = [
  {
    id: 'italian',
    name: 'Italian Game',
    ecoCodes: ['C50'],
    variations: [
      {
        id: 'main',
        name: 'Main',
        lines: [
          {
            id: 'classical',
            name: 'Classical',
            eco: 'C50',
            movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
            movesUci: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'],
          },
        ],
      },
    ],
  },
];

const STUBBED_DOCUMENTS: Readonly<Record<string, unknown>> = {
  '/openings.json': SMALL_OPENINGS_DOCUMENT,
};

export function stubDecksFetch(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const document = url === '/decks.json' ? body : STUBBED_DOCUMENTS[url];
      return Promise.resolve(
        document === undefined ? new Response('', { status: 404 }) : Response.json(document),
      );
    }),
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
