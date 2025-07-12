export interface Cell {
  x: number;
  y: number;
}

export interface Shape {
  name: string;
  cells: Cell[];
}

export interface Piece {
  id: number;
  shape: Shape;
  color: string;
  cells: Cell[];
  canMoveTo(board: (number | null)[][], dx: number, dy: number): boolean;
  moveTo(dx: number, dy: number): void;
  getBottomY(): number;
}

export interface GameState {
  board: (number | null)[][];
  pieces: Map<number, Piece>;
  selected: number | null;
  moves: number;
  level: number;
  animating: boolean;
}

export interface GameConfig {
  cols: number;
  rows: number;
  cellSize: number;
}

export const GAME_EVENTS = {
  PIECE_SELECTED: 'piece:selected',
  PIECE_REMOVED: 'piece:removed',
  LEVEL_COMPLETE: 'level:complete',
  LINE_CLEARED: 'line:cleared',
  GRAVITY_APPLIED: 'gravity:applied',
} as const;

export type GameEvent = typeof GAME_EVENTS[keyof typeof GAME_EVENTS];