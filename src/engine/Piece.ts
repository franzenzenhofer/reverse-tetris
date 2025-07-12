import { Piece as IPiece, Shape, Cell } from '@/types/game';

export class Piece implements IPiece {
  id: number;
  shape: Shape;
  color: string;
  cells: Cell[];

  constructor(id: number, shape: Shape, color: string, x: number, y: number) {
    this.id = id;
    this.shape = shape;
    this.color = color;
    this.cells = shape.cells.map(cell => ({ x: x + cell.x, y: y + cell.y }));
  }

  canMoveTo(board: (number | null)[][], dx: number, dy: number): boolean {
    return this.cells.every(cell => {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      return nx >= 0 && nx < board[0].length && 
             ny >= 0 && ny < board.length && 
             (!board[ny][nx] || board[ny][nx] === this.id);
    });
  }

  moveTo(dx: number, dy: number): void {
    this.cells = this.cells.map(cell => ({ 
      x: cell.x + dx, 
      y: cell.y + dy 
    }));
  }

  getBottomY(): number {
    return Math.max(...this.cells.map(cell => cell.y));
  }

  clone(): Piece {
    const cloned = new Piece(this.id, this.shape, this.color, 0, 0);
    cloned.cells = this.cells.map(cell => ({ ...cell }));
    return cloned;
  }
}