import { GameEngine } from './engine/GameEngine';
import { Renderer } from './ui/Renderer';
import { UI } from './ui/UI';
import { GameHUD } from './ui/GameHUD';
import { InputHandler } from './input/InputHandler';
import { COLS, ROWS, calculateCellSize } from './engine/constants';
import { GAME_EVENTS, GameConfig } from './types/game';
import './styles/main.css';

class Game {
  private engine: GameEngine;
  private renderer: Renderer;
  private ui: UI;
  private hud: GameHUD;
  private inputHandler: InputHandler;
  private canvas: HTMLCanvasElement;
  private config: GameConfig;
  private resizeTimeout: number | null = null;
  private lastTime: number = 0;
  private animationId: number | null = null;

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
    this.hud = new GameHUD();
    
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
    
    // Start game loop
    this.lastTime = performance.now();
    this.gameLoop();
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
    
    // Score and combo events
    this.engine.addEventListener(GAME_EVENTS.SCORE_UPDATE, (event) => {
      const detail = (event as CustomEvent).detail;
      this.hud.updateScore(detail.score, detail.scoreGain);
    });
    
    this.engine.addEventListener(GAME_EVENTS.COMBO_UPDATE, (event) => {
      const detail = (event as CustomEvent).detail;
      this.hud.updateCombo(detail.combo);
    });
    
    // Time and corruption events
    this.engine.addEventListener(GAME_EVENTS.TIME_UPDATE, (event) => {
      const detail = (event as CustomEvent).detail;
      this.hud.updateTimer(detail.timeRemaining);
      this.renderer.setCorruptionLevel(detail.corruptionLevel);
    });
    
    this.engine.addEventListener(GAME_EVENTS.CORRUPTION_RISE, (event) => {
      const detail = (event as CustomEvent).detail;
      this.renderer.setCorruptionLevel(detail.level);
    });
    
    // Game over event
    this.engine.addEventListener(GAME_EVENTS.GAME_OVER, (event) => {
      const detail = (event as CustomEvent).detail;
      this.hud.showGameOver(detail.score, () => {
        this.engine.startNewGame();
        this.hud.reset();
        this.render();
      });
    });
    
    this.engine.addEventListener(GAME_EVENTS.GRAVITY_APPLIED, (event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.fallingPieces) {
        // Animate falling pieces
        this.renderer.animateFalling(detail.fallingPieces).then(() => {
          this.render();
        });
      } else {
        this.render();
      }
    });
    
    this.engine.addEventListener(GAME_EVENTS.LINE_CLEARED, (event) => {
      const detail = (event as CustomEvent).detail as { 
        paths: Array<Array<{x: number, y: number}>>,
        pathCount: number,
        totalCells: number,
        bonus: number
      };
      
      // Show message about paths cleared
      this.ui.showMessage(`${detail.pathCount} path${detail.pathCount > 1 ? 's' : ''} cleared! (${detail.totalCells} cells)`);
      
      // Set path animation
      this.renderer.setPathClearAnimation(detail.paths);
      
      // Immediately render to show board state changes
      this.render();
    });
    
    this.engine.addEventListener(GAME_EVENTS.LEVEL_COMPLETE, () => {
      const state = this.engine.getState();
      this.ui.showWin();
      this.hud.updateLevel(state.level);
      setTimeout(() => {
        this.ui.hideWin();
        this.render();
      }, 1500);
    });
  }

  private handleCellClick(x: number, y: number): void {
    const state = this.engine.getState();
    
    if (state.gameOver) return;
    
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
  
  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update game state
    this.engine.update(deltaTime);
    
    // Render
    this.render();
    
    // Continue loop
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }
  
  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});