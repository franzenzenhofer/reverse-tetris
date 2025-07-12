export class GameHUD {
  private container: HTMLElement;
  private scoreElement: HTMLElement;
  private comboElement: HTMLElement;
  private timerElement: HTMLElement;
  private levelElement: HTMLElement;
  private gameOverElement: HTMLElement;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'game-hud';
    
    // Score display
    const scoreContainer = document.createElement('div');
    scoreContainer.className = 'hud-item score-container';
    scoreContainer.innerHTML = `
      <div class="hud-label">SCORE</div>
      <div class="hud-value score-value">0</div>
    `;
    this.scoreElement = scoreContainer.querySelector('.score-value')!;
    
    // Combo display
    const comboContainer = document.createElement('div');
    comboContainer.className = 'hud-item combo-container';
    comboContainer.innerHTML = `
      <div class="hud-label">COMBO</div>
      <div class="hud-value combo-value">x0</div>
    `;
    this.comboElement = comboContainer.querySelector('.combo-value')!;
    
    // Timer display
    const timerContainer = document.createElement('div');
    timerContainer.className = 'hud-item timer-container';
    timerContainer.innerHTML = `
      <div class="hud-label">TIME</div>
      <div class="hud-value timer-value">60</div>
    `;
    this.timerElement = timerContainer.querySelector('.timer-value')!;
    
    // Level display
    const levelContainer = document.createElement('div');
    levelContainer.className = 'hud-item level-container';
    levelContainer.innerHTML = `
      <div class="hud-label">LEVEL</div>
      <div class="hud-value level-value">1</div>
    `;
    this.levelElement = levelContainer.querySelector('.level-value')!;
    
    // Game over overlay
    this.gameOverElement = document.createElement('div');
    this.gameOverElement.className = 'game-over-overlay hidden';
    this.gameOverElement.innerHTML = `
      <div class="game-over-content">
        <h1>GAME OVER</h1>
        <div class="final-score">SCORE: <span>0</span></div>
        <button class="restart-button">PLAY AGAIN</button>
      </div>
    `;
    
    this.container.appendChild(scoreContainer);
    this.container.appendChild(comboContainer);
    this.container.appendChild(timerContainer);
    this.container.appendChild(levelContainer);
    
    document.body.appendChild(this.container);
    document.body.appendChild(this.gameOverElement);
  }
  
  updateScore(score: number, scoreGain?: number): void {
    this.scoreElement.textContent = score.toString();
    
    if (scoreGain && scoreGain > 0) {
      // Show floating score animation
      const floatingScore = document.createElement('div');
      floatingScore.className = 'floating-score';
      floatingScore.textContent = `+${scoreGain}`;
      floatingScore.style.left = '50%';
      floatingScore.style.top = '50%';
      document.body.appendChild(floatingScore);
      
      setTimeout(() => floatingScore.remove(), 1500);
    }
  }
  
  updateCombo(combo: number): void {
    this.comboElement.textContent = `x${combo}`;
    this.comboElement.classList.toggle('combo-active', combo > 0);
    
    if (combo > 5) {
      this.comboElement.classList.add('combo-hot');
    } else {
      this.comboElement.classList.remove('combo-hot');
    }
  }
  
  updateTimer(timeRemaining: number): void {
    const seconds = Math.ceil(timeRemaining / 1000);
    this.timerElement.textContent = seconds.toString();
    
    // Add warning class when time is low
    if (seconds <= 10) {
      this.timerElement.classList.add('timer-warning');
    } else {
      this.timerElement.classList.remove('timer-warning');
    }
  }
  
  updateLevel(level: number): void {
    this.levelElement.textContent = level.toString();
  }
  
  showGameOver(score: number, onRestart: () => void): void {
    this.gameOverElement.classList.remove('hidden');
    const finalScoreElement = this.gameOverElement.querySelector('.final-score span')!;
    finalScoreElement.textContent = score.toString();
    
    const restartButton = this.gameOverElement.querySelector('.restart-button')!;
    restartButton.addEventListener('click', () => {
      this.gameOverElement.classList.add('hidden');
      onRestart();
    }, { once: true });
  }
  
  reset(): void {
    this.scoreElement.textContent = '0';
    this.comboElement.textContent = 'x0';
    this.timerElement.textContent = '60';
    this.levelElement.textContent = '1';
    this.gameOverElement.classList.add('hidden');
    this.comboElement.classList.remove('combo-active', 'combo-hot');
    this.timerElement.classList.remove('timer-warning');
  }
}