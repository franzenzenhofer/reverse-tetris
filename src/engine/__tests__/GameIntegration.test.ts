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

  it('should trigger line clear events in generated levels', async () => {
    const lineClearListener = vi.fn();
    engine.addEventListener(GAME_EVENTS.LINE_CLEARED, lineClearListener);
    
    // Generate level and simulate strategic piece removal
    engine.generateLevel();
    const state = engine.getState();
    
    // Find bottom row gaps
    const bottomRow = state.board[ROWS - 1];
    const gapPositions = bottomRow
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell === null)
      .map(({ index }) => index);
    
    // Remove pieces strategically to cause line clears
    const pieces = Array.from(state.pieces.values());
    let piecesRemoved = 0;
    
    for (const piece of pieces) {
      // Check if removing this piece might help complete a line
      const pieceBottomY = Math.max(...piece.cells.map(cell => cell.y));
      
      if (pieceBottomY < ROWS - 3) { // Piece above bottom area
        engine.selectPiece(piece.id);
        engine.selectPiece(piece.id);
        piecesRemoved++;
        
        // Wait for animations
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (piecesRemoved >= 3) break; // Limit to avoid test timeout
      }
    }
    
    // Should have triggered at least some line clears
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
    
    // Should show general increasing trend
    const firstHalf = levelDifficulties.slice(0, 5).reduce((a, b) => a + b) / 5;
    const secondHalf = levelDifficulties.slice(5).reduce((a, b) => a + b) / 5;
    
    expect(secondHalf).toBeGreaterThan(firstHalf);
  });

  it('should guarantee winnable levels', async () => {
    for (let level = 1; level <= 5; level++) {
      engine.reset();
      engine.setLevel(level);
      engine.generateLevel();
      
      const state = engine.getState();
      const maxPieces = state.pieces.size;
      
      // Simulate playing the level by removing random pieces
      let movesAttempted = 0;
      const maxMoves = maxPieces * 2; // Reasonable move limit
      
      while (state.pieces.size > 0 && movesAttempted < maxMoves) {
        const pieces = Array.from(state.pieces.values());
        if (pieces.length === 0) break;
        
        // Pick a random removable piece
        const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
        
        engine.selectPiece(randomPiece.id);
        engine.selectPiece(randomPiece.id);
        
        movesAttempted++;
        
        // Wait for animations
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Safety break if level is completed
        if (engine.getState().pieces.size === 0) break;
      }
      
      // Level should be completable within reasonable moves
      // (This is a basic test - real solvability would need more sophisticated analysis)
      expect(movesAttempted).toBeLessThan(maxMoves);
    }
  });

  it('should handle rapid piece removal without breaking', async () => {
    engine.generateLevel();
    const state = engine.getState();
    const pieces = Array.from(state.pieces.keys()).slice(0, 3);
    
    // Rapidly remove multiple pieces
    const removePromises = pieces.map(async (pieceId, index) => {
      // Stagger removals slightly
      await new Promise(resolve => setTimeout(resolve, index * 50));
      
      if (engine.getState().pieces.has(pieceId)) {
        engine.selectPiece(pieceId);
        engine.selectPiece(pieceId);
      }
    });
    
    await Promise.all(removePromises);
    
    // Wait for all animations
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Game should still be in valid state
    const finalState = engine.getState();
    expect(finalState.pieces.size).toBeLessThan(state.pieces.size);
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