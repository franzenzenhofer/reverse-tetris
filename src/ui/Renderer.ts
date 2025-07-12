import { GameState, GameConfig, Piece } from '@/types/game';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;

  constructor(canvas: HTMLCanvasElement, config: GameConfig) {
    this.config = config;
    canvas.width = config.cols * config.cellSize;
    canvas.height = config.rows * config.cellSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
  }

  render(state: GameState): void {
    this.clear();
    this.drawGrid();
    this.drawPieces(state);
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, 
      this.config.cols * this.config.cellSize, 
      this.config.rows * this.config.cellSize
    );
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    this.ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= this.config.cols; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.config.cellSize, 0);
      this.ctx.lineTo(x * this.config.cellSize, this.config.rows * this.config.cellSize);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= this.config.rows; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.config.cellSize);
      this.ctx.lineTo(this.config.cols * this.config.cellSize, y * this.config.cellSize);
      this.ctx.stroke();
    }
  }

  private drawPieces(state: GameState): void {
    for (const piece of state.pieces.values()) {
      this.drawPiece(piece, piece.id === state.selected);
    }
  }

  private drawPiece(piece: Piece, isSelected: boolean): void {
    this.ctx.fillStyle = piece.color;
    
    for (const cell of piece.cells) {
      if (isSelected) {
        // Selected piece with border
        this.ctx.fillRect(
          cell.x * this.config.cellSize + 2, 
          cell.y * this.config.cellSize + 2, 
          this.config.cellSize - 4, 
          this.config.cellSize - 4
        );
        
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
          cell.x * this.config.cellSize + 2, 
          cell.y * this.config.cellSize + 2, 
          this.config.cellSize - 4, 
          this.config.cellSize - 4
        );
      } else {
        // Normal piece
        this.ctx.fillRect(
          cell.x * this.config.cellSize + 1, 
          cell.y * this.config.cellSize + 1, 
          this.config.cellSize - 2, 
          this.config.cellSize - 2
        );
      }
    }
  }

  animateRemoval(piece: Piece): Promise<void> {
    return new Promise(resolve => {
      let opacity = 1;
      const animate = () => {
        opacity -= 0.05;
        
        if (opacity <= 0) {
          resolve();
          return;
        }
        
        this.ctx.globalAlpha = opacity;
        this.drawPiece(piece, false);
        this.ctx.globalAlpha = 1;
        
        requestAnimationFrame(animate);
      };
      
      animate();
    });
  }
}