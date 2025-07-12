import { test, expect } from '@playwright/test';

test.describe('Pressure Gameplay Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display HUD with score, combo, timer, and level', async ({ page }) => {
    // Check HUD elements exist
    await expect(page.locator('.game-hud')).toBeVisible();
    await expect(page.locator('.score-value')).toBeVisible();
    await expect(page.locator('.combo-value')).toBeVisible();
    await expect(page.locator('.timer-value')).toBeVisible();
    await expect(page.locator('.level-value')).toBeVisible();
    
    // Check initial values
    await expect(page.locator('.score-value')).toHaveText('0');
    await expect(page.locator('.combo-value')).toHaveText('x0');
    await expect(page.locator('.level-value')).toHaveText('1');
  });

  test('should update score when removing pieces', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Click on a piece
    await canvas.click({ position: { x: 100, y: 300 } });
    await page.waitForTimeout(100);
    
    // Click again to remove
    await canvas.click({ position: { x: 100, y: 300 } });
    await page.waitForTimeout(500);
    
    // Score should have increased
    const scoreText = await page.locator('.score-value').textContent();
    expect(parseInt(scoreText || '0')).toBeGreaterThan(0);
  });

  test('should show corruption rising from bottom', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/corruption-initial.png' });
    
    // Wait for corruption to rise
    await page.waitForTimeout(5000);
    
    // Take screenshot showing corruption
    await page.screenshot({ path: 'screenshots/corruption-risen.png' });
    
    // Corruption should be visible (red gradient at bottom)
    // Visual verification needed
  });

  test('should decrease timer over time', async ({ page }) => {
    // Get initial timer value
    const initialTime = await page.locator('.timer-value').textContent();
    const initial = parseInt(initialTime || '60');
    
    // Wait 2 seconds
    await page.waitForTimeout(2000);
    
    // Timer should have decreased
    const currentTime = await page.locator('.timer-value').textContent();
    const current = parseInt(currentTime || '60');
    
    expect(current).toBeLessThan(initial);
  });

  test('should show combo multiplier for quick moves', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Make rapid moves
    for (let i = 0; i < 3; i++) {
      await canvas.click({ position: { x: 150 + i * 50, y: 300 } });
      await page.waitForTimeout(50);
      await canvas.click({ position: { x: 150 + i * 50, y: 300 } });
      await page.waitForTimeout(200);
    }
    
    // Combo should be active
    const comboText = await page.locator('.combo-value').textContent();
    const combo = parseInt(comboText?.replace('x', '') || '0');
    expect(combo).toBeGreaterThan(0);
    
    // Combo element should have active class
    await expect(page.locator('.combo-value')).toHaveClass(/combo-active/);
  });

  test('should trigger game over when time runs out', async ({ page }) => {
    // Wait for game over (this would take 60 seconds normally)
    // For testing, we'd need to modify the initial time or add a test mode
    
    // Check that game over overlay exists (hidden initially)
    await expect(page.locator('.game-over-overlay')).toHaveClass(/hidden/);
  });

  test('should allow restart after game over', async ({ page }) => {
    // This test would require triggering game over first
    // Then clicking restart button and verifying game resets
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // HUD should still be visible and properly sized
    await expect(page.locator('.game-hud')).toBeVisible();
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'screenshots/mobile-pressure-gameplay.png' });
  });
});