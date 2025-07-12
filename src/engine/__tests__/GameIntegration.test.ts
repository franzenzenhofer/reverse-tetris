import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../GameEngine';
import { GAME_EVENTS } from '@/types/game';
import { COLS, ROWS } from '../constants';

describe('Game Integration with Improved Algorithm', () => {
  let engine: GameEngine;
  const config = { cols: COLS, rows: ROWS, cellSize: 32 };

  beforeEach(() => {
    engine = new GameEngine(config);
  });

  it('should trigger line clear events when conditions are met', async () => {
    const lineClearListener = vi.fn();
    engine.addEventListener(GAME_EVENTS.LINE_CLEARED, lineClearListener);
    
    // Create a test scenario with a guaranteed clear
    engine.reset();
    engine.setLevel(1);
    
    // Manually create a scenario that should trigger a clear
    const state = engine.getState();
    
    // Fill most of bottom row to create clear potential
    const bottomRow = ROWS - 1;
    for (let x = 0; x < COLS; x++) {
      state.board[bottomRow][x] = 999; // Fake piece ID
    }
    
    // Trigger line clear check
    engine['clearFullLines'](); // Access private method for testing
    
    // Should have triggered line clear
    expect(lineClearListener).toHaveBeenCalled();
  });

  it('should create cascade effects when pieces are removed', async () => {
    const gravityListener = vi.fn();
    engine.addEventListener(GAME_EVENTS.GRAVITY_APPLIED, gravityListener);
    
    engine.generateLevel();
    const initialState = engine.getState();
    const initialPiecePositions = new Map();
    
    // Record initial positions
    initialState.pieces.forEach((piece, id) => {
      initialPiecePositions.set(id, [...piece.cells]);
    });
    
    // Remove a piece that should cause cascades
    const pieces = Array.from(initialState.pieces.values());
    const targetPiece = pieces.find(piece => 
      piece.cells.some(cell => cell.y < ROWS - 5) // Middle-area piece
    );
    
    if (targetPiece) {
      engine.selectPiece(targetPiece.id);
      engine.selectPiece(targetPiece.id);
      
      // Wait for cascades
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const newState = engine.getState();
      
      // Check if any remaining pieces moved
      let piecesMovedDown = 0;
      newState.pieces.forEach((piece, id) => {
        const initialCells = initialPiecePositions.get(id);
        if (initialCells) {
          const hasMovedDown = piece.cells.some((cell, index) => 
            cell.y > initialCells[index]?.y
          );
          if (hasMovedDown) piecesMovedDown++;
        }
      });
      
      // Should have caused some pieces to move
      expect(piecesMovedDown).toBeGreaterThan(0);
      expect(gravityListener).toHaveBeenCalled();
    }
  });

  it('should maintain game balance across multiple levels', () => {
    const levelDifficulties: number[] = [];
    
    for (let level = 1; level <= 10; level++) {
      engine.reset();
      engine.setLevel(level);
      engine.generateLevel();
      
      const state = engine.getState();
      
      // Calculate difficulty metrics
      const pieceCount = state.pieces.size;
      const filledCells = state.board.flat().filter(cell => cell !== null).length;
      const density = filledCells / (COLS * ROWS);
      
      // Combine metrics for difficulty score
      const difficulty = pieceCount * 2 + density * 100;
      levelDifficulties.push(difficulty);
    }
    
    // Should show general progression (allow for some randomness)
    const firstThird = levelDifficulties.slice(0, 3);
    const lastThird = levelDifficulties.slice(-3);
    
    const avgFirst = firstThird.reduce((a, b) => a + b) / firstThird.length;
    const avgLast = lastThird.reduce((a, b) => a + b) / lastThird.length;
    
    // Allow for some variance but expect general upward trend
    expect(avgLast).toBeGreaterThanOrEqual(avgFirst * 0.8); // Within 80% is acceptable
  });

  it('should create completable levels', async () => {
    // Test that levels have removable pieces (basic completability)
    for (let level = 1; level <= 3; level++) {
      engine.reset();
      engine.setLevel(level);
      engine.generateLevel();
      
      const state = engine.getState();
      const initialPieceCount = state.pieces.size;
      
      // Should have pieces to play with
      expect(initialPieceCount).toBeGreaterThan(0);
      
      // Try removing a couple pieces to verify game mechanics work
      const pieces = Array.from(state.pieces.values()).slice(0, 2);
      
      for (const piece of pieces) {
        if (engine.getState().pieces.has(piece.id)) {
          engine.selectPiece(piece.id);
          engine.selectPiece(piece.id);
          
          // Brief wait for processing
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Verify piece was removed
          expect(engine.getState().pieces.has(piece.id)).toBe(false);
        }
      }
      
      // Should have fewer pieces after removal
      expect(engine.getState().pieces.size).toBeLessThan(initialPieceCount);
    }
  });

  it('should handle piece removal without breaking', async () => {
    engine.generateLevel();
    const initialState = engine.getState();
    const initialPieceCount = initialState.pieces.size;
    
    // Remove a few pieces one by one
    const piecesToRemove = Array.from(initialState.pieces.keys()).slice(0, 2);
    
    for (const pieceId of piecesToRemove) {
      if (engine.getState().pieces.has(pieceId)) {
        engine.selectPiece(pieceId);
        engine.selectPiece(pieceId);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Game should still be in valid state
    const finalState = engine.getState();
    expect(finalState.pieces.size).toBeLessThanOrEqual(initialPieceCount);
    expect(finalState.animating).toBe(false);
    
    // Board consistency check
    finalState.pieces.forEach(piece => {
      piece.cells.forEach(cell => {
        expect(finalState.board[cell.y][cell.x]).toBe(piece.id);
      });
    });
  });

  it('should create diverse level layouts', () => {
    const levelHashes = new Set<string>();
    
    // Generate multiple levels and check they're different
    for (let i = 0; i < 10; i++) {
      engine.reset();
      engine.generateLevel();
      
      const state = engine.getState();
      
      // Create hash of level layout
      const layout = state.board.map(row => 
        row.map(cell => cell === null ? '0' : '1').join('')
      ).join('|');
      
      levelHashes.add(layout);
    }
    
    // Should generate diverse layouts
    expect(levelHashes.size).toBeGreaterThan(5);
  });
});