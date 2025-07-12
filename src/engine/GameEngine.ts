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
    
    let nextId = 1;
    
    // Step 1: Create almost-complete lines at bottom (guaranteed line clear)
    const targetRow = this.config.rows - 1;
    const gaps = 1 + Math.floor(Math.random() * 2); // 1-2 gaps
    const gapPositions = new Set<number>();
    
    while (gapPositions.size < gaps) {
      gapPositions.add(Math.floor(Math.random() * this.config.cols));
    }
    
    // Fill bottom line except gaps
    for (let x = 0; x < this.config.cols; x++) {
      if (!gapPositions.has(x)) {
        const piece = new Piece(nextId, SHAPES[0], COLORS[nextId - 1], x, targetRow);
        piece.cells = [{ x, y: targetRow }]; // Single cell
        this.state.board[targetRow][x] = nextId;
        this.state.pieces.set(nextId, piece);
        nextId++;
      }
    }
    
    // Step 2: Add pieces that will fall into gaps (cascade effect)
    gapPositions.forEach(gapX => {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const x = Math.max(0, Math.min(this.config.cols - 4, gapX - 1));
      const y = targetRow - Math.floor(Math.random() * 8) - 5;
      
      if (y >= 0) {
        const piece = new Piece(nextId, shape, COLORS[(nextId - 1) % COLORS.length], x, y);
        
        if (piece.cells.every(cell => 
          cell.y >= 0 && cell.x >= 0 && cell.x < this.config.cols && 
          !this.state.board[cell.y]?.[cell.x]
        )) {
          piece.cells.forEach(cell => {
            this.state.board[cell.y][cell.x] = nextId;
          });
          this.state.pieces.set(nextId, piece);
          nextId++;
        }
      }
    });
    
    // Step 3: Add regular pieces for difficulty
    const extraPieces = Math.min(2 + Math.floor(this.state.level / 3), 8);
    for (let i = 0; i < extraPieces; i++) {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      
      let placed = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        const x = Math.floor(Math.random() * (this.config.cols - 4));
        const y = Math.floor(Math.random() * Math.min(15, this.config.rows - 8));
        
        const piece = new Piece(nextId, shape, COLORS[(nextId - 1) % COLORS.length], x, y);
        
        if (piece.cells.every(cell => 
          cell.y >= 0 && cell.x >= 0 && cell.x < this.config.cols && 
          !this.state.board[cell.y]?.[cell.x]
        )) {
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