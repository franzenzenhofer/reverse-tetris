import { GameEngine } from './engine/GameEngine';
import { Renderer } from './ui/Renderer';
import { UI } from './ui/UI';
import { InputHandler } from './input/InputHandler';
import { COLS, ROWS, CELL_SIZE } from './engine/constants';
import { GAME_EVENTS } from './types/game';
import './styles/main.css';

class Game {
  private engine: GameEngine;
  private renderer: Renderer;
  private ui: UI;
  private inputHandler: InputHandler;

  constructor() {
    const config = { cols: COLS, rows: ROWS, cellSize: CELL_SIZE };
    
    // Initialize engine
    this.engine = new GameEngine(config);
    
    // Initialize renderer
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.renderer = new Renderer(canvas, config);
    
    // Initialize UI
    this.ui = new UI();
    
    // Initialize input
    this.inputHandler = new InputHandler({
      canvas,
      config,
      onCellClick: this.handleCellClick.bind(this),
    });
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start game
    this.engine.generateLevel();
    this.render();
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