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
      let scale = 1;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / 300; // 300ms animation
        
        if (progress >= 1) {
          resolve();
          return;
        }
        
        opacity = 1 - progress;
        scale = 1 - progress * 0.3; // Shrink slightly
        
        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        
        // Draw with scale effect
        piece.cells.forEach(cell => {
          const centerX = cell.x * this.config.cellSize + this.config.cellSize / 2;
          const centerY = cell.y * this.config.cellSize + this.config.cellSize / 2;
          const size = this.config.cellSize * scale;
          
          this.ctx.fillStyle = piece.color;
          this.ctx.fillRect(
            centerX - size / 2 + 1,
            centerY - size / 2 + 1,
            size - 2,
            size - 2
          );
        });
        
        this.ctx.restore();
        requestAnimationFrame(animate);
      };
      
      animate();
    });
  }

  animateLineClear(lines: number[]): Promise<void> {
    return new Promise(resolve => {
      let progress = 0;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = elapsed / 500; // 500ms animation
        
        if (progress >= 1) {
          resolve();
          return;
        }
        
        this.ctx.save();
        
        // Flash effect
        const flashIntensity = Math.sin(progress * Math.PI * 8) * 0.5 + 0.5;
        
        lines.forEach(lineY => {
          // White flash overlay
          this.ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.6})`;
          this.ctx.fillRect(
            0,
            lineY * this.config.cellSize,
            this.config.cols * this.config.cellSize,
            this.config.cellSize
          );
          
          // Shrinking line effect
          const shrink = progress * 0.8;
          this.ctx.fillStyle = `rgba(255, 255, 0, ${1 - progress})`;
          this.ctx.fillRect(
            0,
            lineY * this.config.cellSize + shrink * this.config.cellSize / 2,
            this.config.cols * this.config.cellSize,
            this.config.cellSize * (1 - shrink)
          );
        });
        
        this.ctx.restore();
        requestAnimationFrame(animate);
      };
      
      animate();
    });
  }

  animateFalling(pieces: Map<number, { from: number; to: number }>): Promise<void> {
    return new Promise(resolve => {
      let progress = 0;
      const startTime = Date.now();
      const duration = 400; // 400ms falling animation
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        if (progress >= 1) {
          resolve();
          return;
        }
        
        this.ctx.save();
        
        // Draw falling pieces at interpolated positions
        pieces.forEach((fallData, pieceId) => {
          const piece = this.findPieceById(pieceId);
          if (piece) {
            const fallDistance = fallData.to - fallData.from;
            const currentY = fallData.from + fallDistance * easeOut;
            
            // Draw piece at current position
            this.drawPieceAtPosition(piece, currentY);
          }
        });
        
        this.ctx.restore();
        requestAnimationFrame(animate);
      };
      
      animate();
    });
  }

  private findPieceById(_id: number): Piece | null {
    // This would need to be passed or accessed somehow
    return null;
  }

  private drawPieceAtPosition(piece: Piece, yOffset: number): void {
    this.ctx.fillStyle = piece.color;
    
    piece.cells.forEach(cell => {
      this.ctx.fillRect(
        cell.x * this.config.cellSize + 1,
        yOffset * this.config.cellSize + 1,
        this.config.cellSize - 2,
        this.config.cellSize - 2
      );
    });
  }
}