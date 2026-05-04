import { Chess } from 'chess.js';
import { useCallback, useRef, useState } from 'react';

export function useChessGame() {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());

  const reset = useCallback(() => {
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
  }, []);

  const syncFen = useCallback(() => setFen(gameRef.current.fen()), []);

  return { gameRef, fen, reset, syncFen };
}
