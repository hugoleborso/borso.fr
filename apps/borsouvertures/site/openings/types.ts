export interface Opening {
  id: string;
  name: string;
  ecoCodes: string[];
  variations: Variation[];
}

export interface Variation {
  id: string;
  name: string;
  lines: Line[];
}

export interface Line {
  id: string;
  name: string;
  eco: string;
  movesSan: string[];
  movesUci: string[];
}
