import { test, expect } from '@playwright/test';

test.describe('Debug Reverse Tetris', () => {
  test('check game state and log console errors', async ({ page }) => {
    // Log all console messages
    page.on('console', msg => {
      console.log(`Browser ${msg.type()}: ${msg.text()}`);
    });
    
    // Log all errors
    page.on('pageerror', error => {
      console.log(`Browser error: ${error.message}`);
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait for game to initialize
    await page.waitForTimeout(2000);
    
    // Check initial state
    const level = await page.locator('#level').textContent();
    const pieces = await page.locator('#pieces').textContent();
    const moves = await page.locator('#moves').textContent();
    
    console.log('Initial state:', { level, pieces, moves });
    
    // Check if canvas exists and has content
    const canvasBounds = await page.locator('#canvas').boundingBox();
    console.log('Canvas bounds:', canvasBounds);
    
    // Try clicking on the canvas
    if (canvasBounds) {
      await page.locator('#canvas').click({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(500);
      console.log('After first click');
      
      // Try double-clicking
      await page.locator('#canvas').dblclick({ position: { x: 150, y: 150 } });
      await page.waitForTimeout(1000);
      
      const movesAfter = await page.locator('#moves').textContent();
      console.log('Moves after double-click:', movesAfter);
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'screenshots/debug-state.png', fullPage: true });
    
    // Check for any JavaScript errors
    const errorLogs = await page.evaluate(() => {
      return window.console.error ? 'Console.error exists' : 'No console.error';
    });
    console.log('Error check:', errorLogs);
  });
});