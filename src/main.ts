import { GameEngine } from './engine/GameEngine';
import { Renderer } from './ui/Renderer';
import { UI } from './ui/UI';
import { InputHandler } from './input/InputHandler';
import { COLS, ROWS, calculateCellSize } from './engine/constants';
import { GAME_EVENTS, GameConfig } from './types/game';
import './styles/main.css';

class Game {
  private engine: GameEngine;
  private renderer: Renderer;
  private ui: UI;
  private inputHandler: InputHandler;
  private canvas: HTMLCanvasElement;
  private config: GameConfig;
  private resizeTimeout: number | null = null;

  constructor() {
    // Get canvas element
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');
    
    // Calculate initial config
    this.config = this.createConfig();
    
    // Initialize engine
    this.engine = new GameEngine(this.config);
    
    // Initialize renderer
    this.renderer = new Renderer(this.canvas, this.config);
    
    // Initialize UI
    this.ui = new UI();
    
    // Initialize input
    this.inputHandler = new InputHandler({
      canvas: this.canvas,
      config: this.config,
      onCellClick: this.handleCellClick.bind(this),
    });
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Handle resize
    this.setupResizeHandler();
    
    // Start game
    this.engine.generateLevel();
    this.render();
  }

  private createConfig(): GameConfig {
    const cellSize = calculateCellSize();
    return { cols: COLS, rows: ROWS, cellSize };
  }

  private setupResizeHandler(): void {
    const handleResize = (): void => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      
      this.resizeTimeout = window.setTimeout(() => {
        this.config = this.createConfig();
        this.renderer = new Renderer(this.canvas, this.config);
        this.render();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Handle viewport changes on mobile
    if ('visualViewport' in window) {
      window.visualViewport?.addEventListener('resize', handleResize);
    }
  }

  private setupEventListeners(): void {
    this.engine.addEventListener(GAME_EVENTS.PIECE_SELECTED, () => this.render());
    this.engine.addEventListener(GAME_EVENTS.PIECE_REMOVED, () => this.render());
    this.engine.addEventListener(GAME_EVENTS.GRAVITY_APPLIED, () => this.render());
    this.engine.addEventListener(GAME_EVENTS.LINE_CLEARED, (event) => {
      const detail = (event as CustomEvent).detail as { lines: number };
      this.ui.showMessage(`${detail.lines} lines cleared!`);
      this.render();
    });
    
    this.engine.addEventListener(GAME_EVENTS.LEVEL_COMPLETE, () => {
      this.ui.showWin();
      setTimeout(() => {
        this.ui.hideWin();
        this.render();
      }, 1500);
    });
  }

  private handleCellClick(x: number, y: number): void {
    const state = this.engine.getState();
    
    if (x === -1 && y === -1) {
      // Deselect
      this.engine.selectPiece(null);
    } else {
      const clickedId = state.board[y]?.[x];
      this.engine.selectPiece(clickedId);
    }
  }

  private render(): void {
    const state = this.engine.getState();
    this.renderer.render(state);
    this.ui.update(state);
  }
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});