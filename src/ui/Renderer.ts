import { GameState, GameConfig, Piece } from '@/types/game';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private corruptionLevel: number = 0;
  private pathClearAnimation: {
    paths: Array<Array<{x: number, y: number}>>;
    startTime: number;
    duration: number;
  } | null = null;

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
    this.drawCorruption();
    this.drawPieces(state);
    this.drawAnimations();
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

  animatePathTracing(paths: Array<Array<{x: number, y: number}>>): Promise<void> {
    return new Promise(resolve => {
      let progress = 0;
      const startTime = Date.now();
      const duration = 400; // Faster animation - cells are already gone!
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = elapsed / duration;
        
        if (progress >= 1) {
          resolve();
          return;
        }
        
        this.ctx.save();
        
        // Draw each path progressively
        paths.forEach((path, pathIndex) => {
          const pathProgress = Math.max(0, (progress - pathIndex * 0.1) * 1.2); // Stagger paths slightly
          const cellsToShow = Math.floor(pathProgress * path.length);
          
          // Draw traced path cells as ghosts (they're already removed!)
          for (let i = 0; i < cellsToShow; i++) {
            const cell = path[i];
            
            // Fading ghost effect - shows where cells WERE
            const fadeOut = 1 - (pathProgress * 0.7);
            const glowIntensity = Math.sin(pathProgress * Math.PI * 3 + i * 0.3) * 0.3 + 0.7;
            
            // Ghost outline only - cells are gone!
            this.ctx.strokeStyle = `rgba(255, 255, 100, ${glowIntensity * fadeOut})`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
              cell.x * this.config.cellSize + 3,
              cell.y * this.config.cellSize + 3,
              this.config.cellSize - 6,
              this.config.cellSize - 6
            );
            
            // Draw connection line to next cell
            if (i < path.length - 1) {
              const nextCell = path[i + 1];
              const centerX = cell.x * this.config.cellSize + this.config.cellSize / 2;
              const centerY = cell.y * this.config.cellSize + this.config.cellSize / 2;
              const nextCenterX = nextCell.x * this.config.cellSize + this.config.cellSize / 2;
              const nextCenterY = nextCell.y * this.config.cellSize + this.config.cellSize / 2;
              
              this.ctx.strokeStyle = `rgba(255, 255, 150, ${glowIntensity * fadeOut * 0.5})`;
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.moveTo(centerX, centerY);
              this.ctx.lineTo(nextCenterX, nextCenterY);
              this.ctx.stroke();
            }
          }
        });
        
        this.ctx.restore();
        requestAnimationFrame(animate);
      };
      
      animate();
    });
  }

  animateLineClear(paths: Array<Array<{x: number, y: number}>>): Promise<void> {
    return new Promise(resolve => {
      let progress = 0;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = elapsed / 200; // Even faster - cells are GONE!
        
        if (progress >= 1) {
          resolve();
          return;
        }
        
        this.ctx.save();
        
        // Just a quick flash effect - cells already removed!
        const flashIntensity = (1 - progress) * 0.5;
        
        paths.forEach(path => {
          path.forEach(cell => {
            // Quick white flash that fades
            this.ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
            this.ctx.fillRect(
              cell.x * this.config.cellSize,
              cell.y * this.config.cellSize,
              this.config.cellSize,
              this.config.cellSize
            );
          });
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
      const duration = 600; // 600ms for more visible falling
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);
        
        // Bounce easing for more dramatic effect
        const easeOutBounce = (t: number): number => {
          if (t < 1 / 2.75) {
            return 7.5625 * t * t;
          } else if (t < 2 / 2.75) {
            t -= 1.5 / 2.75;
            return 7.5625 * t * t + 0.75;
          } else if (t < 2.5 / 2.75) {
            t -= 2.25 / 2.75;
            return 7.5625 * t * t + 0.9375;
          } else {
            t -= 2.625 / 2.75;
            return 7.5625 * t * t + 0.984375;
          }
        };
        
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
            const currentY = fallData.from + fallDistance * easeOutBounce(progress);
            
            // Add motion blur effect
            this.ctx.globalAlpha = 0.3;
            for (let i = 1; i <= 3; i++) {
              const blurY = currentY - (i * 0.5);
              this.drawPieceAtPosition(piece, blurY);
            }
            
            // Draw main piece
            this.ctx.globalAlpha = 1;
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

  private drawCorruption(): void {
    if (this.corruptionLevel <= 0) return;
    
    const gradient = this.ctx.createLinearGradient(
      0, 
      this.config.rows * this.config.cellSize,
      0,
      (this.config.rows - this.corruptionLevel) * this.config.cellSize
    );
    
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.9)');
    gradient.addColorStop(0.5, 'rgba(200, 0, 0, 0.7)');
    gradient.addColorStop(1, 'rgba(150, 0, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      0,
      (this.config.rows - this.corruptionLevel) * this.config.cellSize,
      this.config.cols * this.config.cellSize,
      this.corruptionLevel * this.config.cellSize
    );
    
    // Draw corruption edge with animated wave
    const time = Date.now() / 100;
    this.ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    for (let x = 0; x <= this.config.cols; x++) {
      const waveY = Math.sin(x * 0.5 + time) * 5;
      const y = (this.config.rows - this.corruptionLevel) * this.config.cellSize + waveY;
      
      if (x === 0) {
        this.ctx.moveTo(x * this.config.cellSize, y);
      } else {
        this.ctx.lineTo(x * this.config.cellSize, y);
      }
    }
    
    this.ctx.stroke();
  }

  private drawAnimations(): void {
    if (this.pathClearAnimation) {
      const elapsed = Date.now() - this.pathClearAnimation.startTime;
      const progress = elapsed / this.pathClearAnimation.duration;
      
      if (progress >= 1) {
        this.pathClearAnimation = null;
        return;
      }
      
      // Draw path clear animation
      this.ctx.save();
      const flashIntensity = (1 - progress) * 0.5;
      
      this.pathClearAnimation.paths.forEach(path => {
        path.forEach(cell => {
          this.ctx.fillStyle = `rgba(255, 255, 100, ${flashIntensity})`;
          this.ctx.fillRect(
            cell.x * this.config.cellSize,
            cell.y * this.config.cellSize,
            this.config.cellSize,
            this.config.cellSize
          );
        });
      });
      
      this.ctx.restore();
    }
  }

  setCorruptionLevel(level: number): void {
    this.corruptionLevel = level;
  }

  setPathClearAnimation(paths: Array<Array<{x: number, y: number}>>): void {
    this.pathClearAnimation = {
      paths,
      startTime: Date.now(),
      duration: 500
    };
  }
}