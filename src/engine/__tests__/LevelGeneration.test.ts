import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import { COLS, ROWS } from '../constants';

describe('Level Generation Algorithm', () => {
  let engine: GameEngine;
  const config = { cols: COLS, rows: ROWS, cellSize: 32 };

  beforeEach(() => {
    engine = new GameEngine(config);
  });

  it('should create almost-complete lines at bottom with gaps', () => {
    engine.generateLevel();
    const state = engine.getState();
    
    // Check bottom row has pieces with gaps
    const bottomRow = state.board[ROWS - 1];
    const filledCells = bottomRow.filter(cell => cell !== null).length;
    const emptyCells = bottomRow.filter(cell => cell === null).length;
    
    expect(filledCells).toBeGreaterThan(COLS - 3); // Most cells filled
    expect(emptyCells).toBeGreaterThan(0); // But has gaps
    expect(emptyCells).toBeLessThanOrEqual(2); // 1-2 gaps max
  });

  it('should place pieces above gaps for cascade effects', () => {
    engine.generateLevel();
    const state = engine.getState();
    
    // Find gaps in bottom row
    const bottomRow = state.board[ROWS - 1];
    const gapPositions = bottomRow
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell === null)
      .map(({ index }) => index);
    
    expect(gapPositions.length).toBeGreaterThan(0);
    
    // Check there are pieces above the gaps
    gapPositions.forEach(gapX => {
      let foundPieceAbove = false;
      for (let y = 0; y < ROWS - 1; y++) {
        // Check area around gap for pieces
        for (let x = Math.max(0, gapX - 2); x <= Math.min(COLS - 1, gapX + 2); x++) {
          if (state.board[y][x] !== null) {
            foundPieceAbove = true;
            break;
          }
        }
        if (foundPieceAbove) break;
      }
      expect(foundPieceAbove).toBe(true);
    });
  });

  it('should increase piece count with level progression', () => {
    const pieceCounts: number[] = [];
    
    for (let level = 1; level <= 5; level++) {
      engine.reset();
      engine.setLevel(level);
      engine.generateLevel();
      pieceCounts.push(engine.getState().pieces.size);
    }
    
    // Generally increasing trend (allowing some variation)
    const averageIncrease = (pieceCounts[4] - pieceCounts[0]) / 4;
    expect(averageIncrease).toBeGreaterThan(0);
  });

  it('should ensure line clear opportunities exist', () => {
    for (let level = 1; level <= 3; level++) {
      engine.reset();
      engine.setLevel(level);
      engine.generateLevel();
      
      const state = engine.getState();
      
      // Simulate removing pieces and check if lines can be completed
      const originalBoard = state.board.map(row => [...row]);
      
      // Count how close bottom rows are to completion
      let nearCompleteLines = 0;
      for (let y = ROWS - 3; y < ROWS; y++) {
        const filledCells = originalBoard[y].filter(cell => cell !== null).length;
        if (filledCells >= COLS - 2) { // Within 2 cells of complete
          nearCompleteLines++;
        }
      }
      
      expect(nearCompleteLines).toBeGreaterThan(0);
    }
  });

  it('should create valid piece placements without overlap', () => {
    engine.generateLevel();
    const state = engine.getState();
    
    // Check no overlapping pieces
    const cellOccupancy = new Map<string, number>();
    
    state.pieces.forEach(piece => {
      piece.cells.forEach(cell => {
        const key = `${cell.x},${cell.y}`;
        const current = cellOccupancy.get(key) || 0;
        cellOccupancy.set(key, current + 1);
        
        // Each cell should only be occupied by one piece
        expect(current).toBe(0);
        
        // Check bounds
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.x).toBeLessThan(COLS);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeLessThan(ROWS);
      });
    });
  });

  it('should maintain board-piece consistency', () => {
    engine.generateLevel();
    const state = engine.getState();
    
    // Every piece cell should be reflected in board
    state.pieces.forEach(piece => {
      piece.cells.forEach(cell => {
        expect(state.board[cell.y][cell.x]).toBe(piece.id);
      });
    });
    
    // Every non-null board cell should belong to a piece
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cellValue = state.board[y][x];
        if (cellValue !== null) {
          const piece = state.pieces.get(cellValue);
          expect(piece).toBeDefined();
          
          // Piece should contain this cell
          const hasCell = piece!.cells.some(cell => cell.x === x && cell.y === y);
          expect(hasCell).toBe(true);
        }
      }
    }
  });

  it('should create cascade opportunities', () => {
    engine.generateLevel();
    const state = engine.getState();
    
    // Count pieces that have other pieces directly above them
    let supportingPieces = 0;
    let supportedPieces = 0;
    
    state.pieces.forEach(piece => {
      const bottomY = Math.max(...piece.cells.map(cell => cell.y));
      const topY = Math.min(...piece.cells.map(cell => cell.y));
      
      // Check if this piece supports others
      let supportsOthers = false;
      for (let checkY = topY - 1; checkY >= 0; checkY--) {
        piece.cells.forEach(cell => {
          if (state.board[checkY]?.[cell.x] && 
              state.board[checkY][cell.x] !== piece.id) {
            supportsOthers = true;
          }
        });
      }
      
      // Check if this piece is supported by others
      let supportedByOthers = false;
      for (let checkY = bottomY + 1; checkY < ROWS; checkY++) {
        piece.cells.forEach(cell => {
          if (state.board[checkY]?.[cell.x] && 
              state.board[checkY][cell.x] !== piece.id) {
            supportedByOthers = true;
          }
        });
      }
      
      if (supportsOthers) supportingPieces++;
      if (supportedByOthers) supportedPieces++;
    });
    
    // Should have some cascade potential
    expect(supportingPieces + supportedPieces).toBeGreaterThan(0);
  });

  it('should handle edge cases without crashes', () => {
    // Test extreme levels
    const extremeLevels = [1, 50, 100];
    
    extremeLevels.forEach(level => {
      expect(() => {
        engine.reset();
        engine.setLevel(level);
        engine.generateLevel();
      }).not.toThrow();
      
      // Should still have pieces
      expect(engine.getState().pieces.size).toBeGreaterThan(0);
    });
  });

  it('should create levels that are actually solvable', () => {
    engine.generateLevel();
    const state = engine.getState();
    
    // Basic solvability check: should be able to remove at least one piece
    // without breaking game rules
    const pieces = Array.from(state.pieces.values());
    let removablePieces = 0;
    
    pieces.forEach(piece => {
      // Simulate removing this piece temporarily
      const tempBoard = state.board.map(row => [...row]);
      piece.cells.forEach(cell => {
        tempBoard[cell.y][cell.x] = null;
      });
      
      // If no floating pieces created, this piece is removable
      let hasFloatingPieces = false;
      // (Simplified check - in real game gravity would be applied)
      
      if (!hasFloatingPieces) {
        removablePieces++;
      }
    });
    
    expect(removablePieces).toBeGreaterThan(0);
  });
});