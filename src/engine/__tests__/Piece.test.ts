import { describe, it, expect } from 'vitest';
import { Piece } from '../Piece';
import { SHAPES } from '../constants';

describe('Piece', () => {
  const testShape = SHAPES[0]; // I piece
  const testColor = '#ff0000';

  it('should create a piece with correct properties', () => {
    const piece = new Piece(1, testShape, testColor, 5, 10);
    
    expect(piece.id).toBe(1);
    expect(piece.shape).toBe(testShape);
    expect(piece.color).toBe(testColor);
    expect(piece.cells).toHaveLength(4);
    expect(piece.cells[0]).toEqual({ x: 5, y: 11 }); // Offset by initial position
  });

  it('should correctly check if it can move to a position', () => {
    const board = Array(20).fill(null).map(() => Array(10).fill(null));
    const piece = new Piece(1, testShape, testColor, 3, 10);
    
    // Should be able to move down
    expect(piece.canMoveTo(board, 0, 1)).toBe(true);
    
    // Should not be able to move off the board
    expect(piece.canMoveTo(board, -5, 0)).toBe(false);
    expect(piece.canMoveTo(board, 10, 0)).toBe(false);
    expect(piece.canMoveTo(board, 0, 20)).toBe(false);
  });

  it('should move to new position correctly', () => {
    const piece = new Piece(1, testShape, testColor, 3, 10);
    const initialCells = piece.cells.map(cell => ({ ...cell }));
    
    piece.moveTo(2, 3);
    
    piece.cells.forEach((cell, index) => {
      expect(cell.x).toBe(initialCells[index].x + 2);
      expect(cell.y).toBe(initialCells[index].y + 3);
    });
  });

  it('should return correct bottom Y coordinate', () => {
    const piece = new Piece(1, testShape, testColor, 0, 5);
    expect(piece.getBottomY()).toBe(6); // I piece is horizontal at y=6
  });

  it('should clone correctly', () => {
    const piece = new Piece(1, testShape, testColor, 3, 10);
    const clone = piece.clone();
    
    expect(clone).not.toBe(piece);
    expect(clone.id).toBe(piece.id);
    expect(clone.shape).toBe(piece.shape);
    expect(clone.color).toBe(piece.color);
    expect(clone.cells).toEqual(piece.cells);
    expect(clone.cells).not.toBe(piece.cells);
  });
});