import { GameConfig } from '@/types/game';

export interface InputHandlerOptions {
  canvas: HTMLCanvasElement;
  config: GameConfig;
  onCellClick: (x: number, y: number) => void;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private config: GameConfig;
  private onCellClick: (x: number, y: number) => void;

  constructor(options: InputHandlerOptions) {
    this.canvas = options.canvas;
    this.config = options.config;
    this.onCellClick = options.onCellClick;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    
    // Touch events with proper handling
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouch.bind(this), { passive: false });
    
    // Prevent default touch behaviors
    this.canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    
    // Keyboard events
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  private handleTouchStart(event: TouchEvent): void {
    // Prevent double-tap zoom on mobile
    event.preventDefault();
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / this.config.cellSize);
    const y = Math.floor((event.clientY - rect.top) / this.config.cellSize);
    
    if (x >= 0 && x < this.config.cols && y >= 0 && y < this.config.rows) {
      this.onCellClick(x, y);
    }
  }

  private handleTouch(event: TouchEvent): void {
    event.preventDefault();
    
    if (event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((touch.clientX - rect.left) / this.config.cellSize);
      const y = Math.floor((touch.clientY - rect.top) / this.config.cellSize);
      
      if (x >= 0 && x < this.config.cols && y >= 0 && y < this.config.rows) {
        this.onCellClick(x, y);
      }
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.onCellClick(-1, -1); // Deselect
        break;
      case 'r':
      case 'R':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
        }
        break;
    }
  }

  destroy(): void {
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouch.bind(this));
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }
}