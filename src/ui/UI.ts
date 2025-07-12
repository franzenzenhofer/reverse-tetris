import { GameState } from '@/types/game';

export class UI {
  private levelElement: HTMLElement;
  private piecesElement: HTMLElement;
  private movesElement: HTMLElement;
  private winElement: HTMLElement;

  constructor() {
    this.levelElement = this.getElement('level');
    this.piecesElement = this.getElement('pieces');
    this.movesElement = this.getElement('moves');
    this.winElement = this.getElement('win');
  }

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Element with id '${id}' not found`);
    return element;
  }

  update(state: GameState): void {
    this.levelElement.textContent = state.level.toString();
    this.piecesElement.textContent = state.pieces.size.toString();
    this.movesElement.textContent = state.moves.toString();
  }

  showWin(): void {
    this.winElement.classList.add('show');
  }

  hideWin(): void {
    this.winElement.classList.remove('show');
  }

  showMessage(message: string, duration: number = 2000): void {
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      pointer-events: none;
      z-index: 1000;
    `;
    
    document.getElementById('game')?.appendChild(messageEl);
    
    setTimeout(() => messageEl.remove(), duration);
  }
}