import { test, expect } from '@playwright/test';

test.describe('Detailed Debug', () => {
  test('check piece interaction in detail', async ({ page }) => {
    // Capture all console logs
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Inject debug code to check game state
    const gameInfo = await page.evaluate(() => {
      // @ts-ignore
      const game = window.game || window.Game || {};
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      
      return {
        canvasSize: { width: canvas?.width, height: canvas?.height },
        canvasClient: { width: canvas?.clientWidth, height: canvas?.clientHeight },
        hasClickListener: canvas ? canvas.onclick !== null : false,
        gameExists: !!game,
        // Try to access game state if possible
        debugInfo: 'Game object checked'
      };
    });
    
    console.log('Game info:', gameInfo);
    
    // Try different click patterns
    const canvas = page.locator('#canvas');
    const bounds = await canvas.boundingBox();
    
    if (bounds) {
      // Try clicking in different areas
      const positions = [
        { x: bounds.width / 4, y: bounds.height - 50 },    // Bottom left
        { x: bounds.width / 2, y: bounds.height - 50 },    // Bottom center
        { x: bounds.width * 3/4, y: bounds.height - 50 },  // Bottom right
        { x: bounds.width / 2, y: bounds.height / 2 },     // Center
      ];
      
      for (let i = 0; i < positions.length; i++) {
        console.log(`Clicking position ${i}:`, positions[i]);
        
        // Single click
        await canvas.click({ position: positions[i] });
        await page.waitForTimeout(300);
        
        // Double click
        await canvas.click({ position: positions[i] });
        await canvas.click({ position: positions[i] });
        await page.waitForTimeout(500);
        
        const moves = await page.locator('#moves').textContent();
        const pieces = await page.locator('#pieces').textContent();
        console.log(`After clicks at position ${i}: moves=${moves}, pieces=${pieces}`);
        
        if (parseInt(moves || '0') > 0) {
          console.log('SUCCESS: Piece was removed!');
          break;
        }
      }
    }
    
    // Log all captured console messages
    console.log('\nAll console logs:', logs);
    
    await page.screenshot({ path: 'screenshots/detailed-debug.png', fullPage: true });
  });
});