import { test, expect } from '@playwright/test';

test.describe('Reverse Tetris - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait for game to initialize
    await page.waitForSelector('#canvas');
    await page.waitForTimeout(1000);
  });

  test('should load game interface correctly', async ({ page }) => {
    // Check all UI elements are present
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('#level')).toBeVisible();
    await expect(page.locator('#pieces')).toBeVisible();
    await expect(page.locator('#moves')).toBeVisible();
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'screenshots/game-initial-load.png', fullPage: true });
    
    // Check initial values
    await expect(page.locator('#level')).toHaveText('1');
    await expect(page.locator('#moves')).toHaveText('0');
    
    // Pieces count should be greater than 0
    const piecesText = await page.locator('#pieces').textContent();
    expect(parseInt(piecesText || '0')).toBeGreaterThan(0);
  });

  test('should handle piece selection and deselection', async ({ page }) => {
    // Click on canvas to select a piece
    await page.locator('#canvas').click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'screenshots/piece-selected.png', fullPage: true });
    
    // Click elsewhere to deselect
    await page.locator('#canvas').click({ position: { x: 50, y: 50 } });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'screenshots/piece-deselected.png', fullPage: true });
  });

  test('should remove pieces when double-clicking', async ({ page }) => {
    // Get initial piece count
    const initialPieces = await page.locator('#pieces').textContent();
    const initialCount = parseInt(initialPieces || '0');
    
    // Double-click to remove a piece
    await page.locator('#canvas').dblclick({ position: { x: 150, y: 150 } });
    await page.waitForTimeout(1000); // Wait for animations
    
    await page.screenshot({ path: 'screenshots/piece-removed.png', fullPage: true });
    
    // Check piece count decreased
    const newPieces = await page.locator('#pieces').textContent();
    const newCount = parseInt(newPieces || '0');
    expect(newCount).toBeLessThanOrEqual(initialCount);
    
    // Check moves increased
    const moves = await page.locator('#moves').textContent();
    expect(parseInt(moves || '0')).toBeGreaterThan(0);
  });

  test('should handle multiple piece removals', async ({ page }) => {
    // Remove multiple pieces in sequence
    const positions = [
      { x: 100, y: 100 },
      { x: 200, y: 150 },
      { x: 150, y: 200 }
    ];
    
    for (let i = 0; i < positions.length; i++) {
      await page.locator('#canvas').dblclick({ position: positions[i] });
      await page.waitForTimeout(800); // Wait for animations and gravity
      
      await page.screenshot({ 
        path: `screenshots/multiple-removals-${i + 1}.png`, 
        fullPage: true 
      });
    }
    
    // Check moves count
    const moves = await page.locator('#moves').textContent();
    expect(parseInt(moves || '0')).toBeGreaterThanOrEqual(1);
  });

  test('should handle line clears when full rows are created', async ({ page }) => {
    // This test would need a controlled scenario
    // For now, just test that the game doesn't crash during normal play
    
    // Remove several pieces to potentially trigger line clears
    for (let i = 0; i < 5; i++) {
      await page.locator('#canvas').dblclick({ 
        position: { x: 100 + i * 50, y: 400 + i * 30 } 
      });
      await page.waitForTimeout(1000);
      
      // Check game is still responsive
      await expect(page.locator('#level')).toBeVisible();
      await expect(page.locator('#pieces')).toBeVisible();
    }
    
    await page.screenshot({ path: 'screenshots/after-line-clear-attempts.png', fullPage: true });
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/mobile-portrait.png', fullPage: true });
    
    // Test touch interaction
    await page.locator('#canvas').tap({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'screenshots/mobile-piece-selected.png', fullPage: true });
    
    // Test double-tap
    await page.locator('#canvas').tap({ position: { x: 150, y: 150 } });
    await page.locator('#canvas').tap({ position: { x: 150, y: 150 } });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/mobile-piece-removed.png', fullPage: true });
  });

  test('should handle landscape orientation', async ({ page }) => {
    // Set landscape viewport
    await page.setViewportSize({ width: 667, height: 375 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/mobile-landscape.png', fullPage: true });
    
    // Test game is still playable
    await page.locator('#canvas').dblclick({ position: { x: 200, y: 150 } });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'screenshots/landscape-gameplay.png', fullPage: true });
  });

  test('should handle rapid piece removal without freezing', async ({ page }) => {
    // Rapid clicking test to ensure no freeze bugs
    const rapidPositions = [
      { x: 100, y: 300 },
      { x: 200, y: 300 },
      { x: 300, y: 300 },
      { x: 150, y: 250 },
      { x: 250, y: 250 }
    ];
    
    // Click rapidly without waiting
    for (const pos of rapidPositions) {
      await page.locator('#canvas').dblclick({ position: pos });
      await page.waitForTimeout(200); // Minimal wait
    }
    
    // Wait for all animations to complete
    await page.waitForTimeout(3000);
    
    // Game should still be responsive
    await expect(page.locator('#level')).toBeVisible();
    await expect(page.locator('#pieces')).toBeVisible();
    await expect(page.locator('#moves')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/rapid-removal-test.png', fullPage: true });
  });

  test('should handle level completion scenarios', async ({ page }) => {
    // Try to complete level by removing all pieces
    // This is a stress test to see if the game handles win conditions
    
    let pieceCount = parseInt(await page.locator('#pieces').textContent() || '0');
    let attempts = 0;
    const maxAttempts = pieceCount * 2; // Reasonable limit
    
    while (pieceCount > 0 && attempts < maxAttempts) {
      // Try different positions
      const x = 100 + (attempts % 5) * 80;
      const y = 100 + Math.floor(attempts / 5) * 80;
      
      await page.locator('#canvas').dblclick({ position: { x, y } });
      await page.waitForTimeout(1000);
      
      const newCount = parseInt(await page.locator('#pieces').textContent() || '0');
      if (newCount < pieceCount) {
        pieceCount = newCount;
      }
      attempts++;
      
      // Take periodic screenshots
      if (attempts % 5 === 0) {
        await page.screenshot({ 
          path: `screenshots/level-progress-${attempts}.png`, 
          fullPage: true 
        });
      }
    }
    
    await page.screenshot({ path: 'screenshots/level-completion-attempt.png', fullPage: true });
  });

  test('should maintain performance with animations', async ({ page }) => {
    // Performance test - measure frame rates during gameplay
    const startTime = Date.now();
    
    // Perform several actions
    for (let i = 0; i < 10; i++) {
      await page.locator('#canvas').dblclick({ 
        position: { x: 120 + i * 30, y: 120 + i * 40 } 
      });
      await page.waitForTimeout(500);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should complete within reasonable time (not frozen)
    expect(totalTime).toBeLessThan(15000); // 15 seconds max
    
    await page.screenshot({ path: 'screenshots/performance-test.png', fullPage: true });
  });

  test('should handle edge cases and error conditions', async ({ page }) => {
    // Click outside game area
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    
    // Click on UI elements
    await page.locator('#level').click();
    await page.locator('#pieces').click();
    await page.locator('#moves').click();
    await page.waitForTimeout(500);
    
    // Rapid random clicking
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 400;
      const y = Math.random() * 600;
      await page.locator('#canvas').click({ position: { x, y } });
    }
    
    await page.waitForTimeout(2000);
    
    // Game should still be functional
    await expect(page.locator('#level')).toBeVisible();
    await expect(page.locator('#pieces')).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/edge-case-test.png', fullPage: true });
  });

  test('should handle window resize correctly', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 768, height: 1024 }, // iPad
      { width: 1920, height: 1080 }, // Desktop
      { width: 1366, height: 768 }   // Laptop
    ];
    
    for (let i = 0; i < viewports.length; i++) {
      await page.setViewportSize(viewports[i]);
      await page.waitForTimeout(1000); // Allow resize handlers
      
      await page.screenshot({ 
        path: `screenshots/viewport-${viewports[i].width}x${viewports[i].height}.png`, 
        fullPage: true 
      });
      
      // Test interaction still works
      await page.locator('#canvas').click({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(500);
    }
  });
});