import { GameState, GameConfig, GAME_EVENTS } from '@/types/game';
import { SHAPES, COLORS } from './constants';
import { Piece } from './Piece';

export class GameEngine extends EventTarget {
  private state: GameState;
  private config: GameConfig;

  constructor(config: GameConfig) {
    super();
    this.config = config;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      board: Array(this.config.rows).fill(null).map(() => Array(this.config.cols).fill(null)),
      pieces: new Map(),
      selected: null,
      moves: 0,
      level: 1,
      animating: false,
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  selectPiece(pieceId: number | null): void {
    if (this.state.animating) return;
    
    if (pieceId === this.state.selected) {
      this.removePiece(pieceId);
    } else {
      this.state.selected = pieceId;
      this.dispatchEvent(new CustomEvent(GAME_EVENTS.PIECE_SELECTED, { 
        detail: { pieceId } 
      }));
    }
  }

  removePiece(pieceId: number | null): void {
    if (!pieceId || this.state.animating) return;
    
    this.state.animating = true;
    const piece = this.state.pieces.get(pieceId);
    
    if (!piece) {
      this.state.animating = false;
      return;
    }

    // Clear from board
    piece.cells.forEach(cell => {
      this.state.board[cell.y][cell.x] = null;
    });

    // Remove piece
    this.state.pieces.delete(pieceId);
    this.state.moves++;
    this.state.selected = null;

    this.dispatchEvent(new CustomEvent(GAME_EVENTS.PIECE_REMOVED, { 
      detail: { pieceId, moves: this.state.moves } 
    }));

    // Apply gravity and check win
    setTimeout(() => {
      this.applyGravity();
      this.clearFullLines();
      
      if (this.state.pieces.size === 0) {
        this.handleLevelComplete();
      }
      
      this.state.animating = false;
    }, 100);
  }

  private applyGravity(): void {
    let changed = true;
    
    while (changed) {
      changed = false;
      
      const sortedPieces = Array.from(this.state.pieces.values()).sort((a, b) => 
        b.getBottomY() - a.getBottomY()
      );
      
      for (const piece of sortedPieces) {
        // Clear current position
        piece.cells.forEach(cell => {
          if (this.state.board[cell.y][cell.x] === piece.id) {
            this.state.board[cell.y][cell.x] = null;
          }
        });
        
        // Find fall distance
        let fallDistance = 0;
        while (piece.canMoveTo(this.state.board, 0, fallDistance + 1)) {
          fallDistance++;
        }
        
        if (fallDistance > 0) {
          piece.moveTo(0, fallDistance);
          changed = true;
        }
        
        // Place in new position
        piece.cells.forEach(cell => {
          this.state.board[cell.y][cell.x] = piece.id;
        });
      }
    }
    
    this.dispatchEvent(new Event(GAME_EVENTS.GRAVITY_APPLIED));
  }

  private clearFullLines(): void {
    const fullLines: number[] = [];
    
    for (let y = 0; y < this.config.rows; y++) {
      if (this.state.board[y].every(cell => cell !== null)) {
        fullLines.push(y);
      }
    }
    
    if (fullLines.length === 0) return;
    
    // Remove cells from full lines
    for (const lineY of fullLines) {
      for (let x = 0; x < this.config.cols; x++) {
        this.state.board[lineY][x] = null;
      }
    }
    
    // Update pieces
    for (const piece of this.state.pieces.values()) {
      piece.cells = piece.cells.filter(cell => !fullLines.includes(cell.y));
      
      if (piece.cells.length === 0) {
        this.state.pieces.delete(piece.id);
      }
    }
    
    // Apply gravity after clearing
    this.applyGravity();
    
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.LINE_CLEARED, { 
      detail: { lines: fullLines.length } 
    }));
  }

  private handleLevelComplete(): void {
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.LEVEL_COMPLETE, { 
      detail: { level: this.state.level, moves: this.state.moves } 
    }));
    
    setTimeout(() => {
      this.state.level++;
      this.generateLevel();
    }, 1500);
  }

  generateLevel(): void {
    this.state = this.createInitialState();
    this.state.level = this.state.level || 1;
    
    const pieceCount = Math.min(4 + Math.floor(this.state.level / 2), 12);
    let nextId = 1;
    
    for (let i = 0; i < pieceCount; i++) {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const color = COLORS[nextId - 1];
      
      let placed = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * (this.config.cols - 4));
        const y = this.config.rows - 5 - Math.floor(Math.random() * Math.min(10, this.config.rows - 5));
        
        const piece = new Piece(nextId, shape, color, x, y);
        
        if (piece.cells.every(cell => !this.state.board[cell.y][cell.x])) {
          piece.cells.forEach(cell => {
            this.state.board[cell.y][cell.x] = nextId;
          });
          
          this.state.pieces.set(nextId, piece);
          nextId++;
          placed = true;
          break;
        }
      }
      
      if (!placed) i--;
    }
    
    this.applyGravity();
  }

  reset(): void {
    this.state = this.createInitialState();
    this.generateLevel();
  }
}