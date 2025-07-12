import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../GameEngine';
import { COLS, ROWS } from '../constants';
import { GAME_EVENTS } from '@/types/game';

describe('GameEngine', () => {
  let engine: GameEngine;
  const config = { cols: COLS, rows: ROWS, cellSize: 32 };

  beforeEach(() => {
    engine = new GameEngine(config);
  });

  it('should initialize with correct state', () => {
    const state = engine.getState();
    
    expect(state.board).toHaveLength(ROWS);
    expect(state.board[0]).toHaveLength(COLS);
    expect(state.pieces.size).toBe(0);
    expect(state.selected).toBeNull();
    expect(state.moves).toBe(0);
    expect(state.level).toBe(1);
    expect(state.animating).toBe(false);
  });

  it('should generate level with pieces', () => {
    engine.generateLevel();
    const state = engine.getState();
    
    expect(state.pieces.size).toBeGreaterThan(0);
    expect(state.pieces.size).toBeLessThanOrEqual(12);
    
    // Check that pieces are on the board
    let pieceCount = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (state.board[y][x] !== null) pieceCount++;
      }
    }
    expect(pieceCount).toBeGreaterThan(0);
  });

  it('should select and deselect pieces', () => {
    engine.generateLevel();
    const state = engine.getState();
    const firstPieceId = Array.from(state.pieces.keys())[0];
    
    // Select piece
    engine.selectPiece(firstPieceId);
    expect(engine.getState().selected).toBe(firstPieceId);
    
    // Deselect
    engine.selectPiece(null);
    expect(engine.getState().selected).toBeNull();
  });

  it('should remove piece when selected twice', () => {
    engine.generateLevel();
    const state = engine.getState();
    const firstPieceId = Array.from(state.pieces.keys())[0];
    const initialPieceCount = state.pieces.size;
    
    // Select piece
    engine.selectPiece(firstPieceId);
    
    // Select again to remove
    engine.selectPiece(firstPieceId);
    
    // Wait for animation
    return new Promise(resolve => {
      setTimeout(() => {
        expect(engine.getState().pieces.size).toBe(initialPieceCount - 1);
        expect(engine.getState().moves).toBe(1);
        resolve(undefined);
      }, 150);
    });
  });

  it('should emit events correctly', () => {
    const selectListener = vi.fn();
    const removeListener = vi.fn();
    
    engine.addEventListener(GAME_EVENTS.PIECE_SELECTED, selectListener);
    engine.addEventListener(GAME_EVENTS.PIECE_REMOVED, removeListener);
    
    engine.generateLevel();
    const firstPieceId = Array.from(engine.getState().pieces.keys())[0];
    
    engine.selectPiece(firstPieceId);
    expect(selectListener).toHaveBeenCalled();
    
    engine.selectPiece(firstPieceId);
    expect(removeListener).toHaveBeenCalled();
  });

  it('should handle level completion', async () => {
    const levelCompleteListener = vi.fn();
    engine.addEventListener(GAME_EVENTS.LEVEL_COMPLETE, levelCompleteListener);
    
    // Create a simple level with one piece
    engine.generateLevel();
    const state = engine.getState();
    
    // Remove all pieces one by one with delays
    const pieceIds = Array.from(state.pieces.keys());
    
    for (const id of pieceIds) {
      engine.selectPiece(id);
      engine.selectPiece(id);
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Wait a bit more for level complete event
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(levelCompleteListener).toHaveBeenCalled();
  });
});