import { test, expect } from '@playwright/test';

test.describe('Mobile Startup Issues', () => {
  test('should start game properly on mobile without text overlay', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/mobile-initial-state.png' });
    
    // Check for any overlapping text
    const hudVisible = await page.locator('.game-hud').isVisible();
    const gameOverVisible = await page.locator('.game-over-overlay').isVisible();
    
    console.log('HUD visible:', hudVisible);
    console.log('Game over overlay visible:', gameOverVisible);
    
    // Game over should be hidden initially
    await expect(page.locator('.game-over-overlay')).toHaveClass(/hidden/);
    
    // Wait 3 seconds to see if game over triggers
    await page.waitForTimeout(3000);
    
    // Take screenshot after 3 seconds
    await page.screenshot({ path: 'screenshots/mobile-after-3-seconds.png' });
    
    // Check if game over appeared
    const gameOverAfterWait = await page.locator('.game-over-overlay:not(.hidden)').isVisible();
    console.log('Game over after 3 seconds:', gameOverAfterWait);
    
    // Check timer value
    const timerValue = await page.locator('.timer-value').textContent();
    console.log('Timer value:', timerValue);
    
    // Check if corruption is too high
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      console.log('Canvas dimensions:', canvas?.width, 'x', canvas?.height);
    });
  });

  test('should be playable on mobile touch', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const canvas = page.locator('canvas');
    
    // Try to tap on a piece
    await canvas.tap({ position: { x: 100, y: 400 } });
    await page.waitForTimeout(100);
    
    // Tap again to remove
    await canvas.tap({ position: { x: 100, y: 400 } });
    await page.waitForTimeout(500);
    
    // Check if score updated
    const scoreText = await page.locator('.score-value').textContent();
    console.log('Score after tap:', scoreText);
    
    await page.screenshot({ path: 'screenshots/mobile-after-tap.png' });
  });

  test('check initial game state values', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Log all initial values
    const score = await page.locator('.score-value').textContent();
    const combo = await page.locator('.combo-value').textContent();
    const timer = await page.locator('.timer-value').textContent();
    const level = await page.locator('.level-value').textContent();
    
    console.log('Initial state:', { score, combo, timer, level });
    
    // Check game engine state
    const gameState = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game;
      if (game && game.engine) {
        const state = game.engine.getState();
        return {
          timeRemaining: state.timeRemaining,
          corruptionLevel: state.corruptionLevel,
          gameOver: state.gameOver,
          pieces: state.pieces.size
        };
      }
      return null;
    });
    
    console.log('Game state:', gameState);
  });
});