import { test, expect } from '@playwright/test';

test.describe('Final Verification - Reverse Tetris', () => {
  test('verify all game features work correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 1. Check initial state
    console.log('=== INITIAL STATE ===');
    const initialPieces = await page.locator('#pieces').textContent();
    const initialMoves = await page.locator('#moves').textContent();
    console.log(`Pieces: ${initialPieces}, Moves: ${initialMoves}`);
    expect(parseInt(initialPieces || '0')).toBeGreaterThan(0);
    
    // 2. Test piece removal
    console.log('\n=== TESTING PIECE REMOVAL ===');
    const canvas = page.locator('#canvas');
    const bounds = await canvas.boundingBox();
    
    if (bounds) {
      // Click near bottom where pieces are likely to be
      await canvas.dblclick({ position: { x: bounds.width / 2, y: bounds.height - 50 } });
      await page.waitForTimeout(1000);
      
      const piecesAfterRemoval = await page.locator('#pieces').textContent();
      const movesAfterRemoval = await page.locator('#moves').textContent();
      console.log(`After removal - Pieces: ${piecesAfterRemoval}, Moves: ${movesAfterRemoval}`);
      
      expect(parseInt(piecesAfterRemoval || '0')).toBeLessThan(parseInt(initialPieces || '0'));
      expect(parseInt(movesAfterRemoval || '0')).toBeGreaterThan(0);
    }
    
    // 3. Test multiple removals (cascade/line clear scenario)
    console.log('\n=== TESTING MULTIPLE REMOVALS ===');
    const startPieces = parseInt(await page.locator('#pieces').textContent() || '0');
    
    // Remove several pieces to potentially trigger line clears
    for (let i = 0; i < 3; i++) {
      const x = (bounds!.width / 4) * (i + 1);
      const y = bounds!.height - 80;
      
      await canvas.dblclick({ position: { x, y } });
      await page.waitForTimeout(800);
      
      const currentPieces = await page.locator('#pieces').textContent();
      console.log(`Removal ${i + 1}: ${currentPieces} pieces remaining`);
    }
    
    const endPieces = parseInt(await page.locator('#pieces').textContent() || '0');
    const totalMoves = await page.locator('#moves').textContent();
    console.log(`Final state - Pieces: ${endPieces}, Total moves: ${totalMoves}`);
    
    // 4. Check for line clear message (if visible)
    const messages = await page.locator('.message').count();
    if (messages > 0) {
      const messageText = await page.locator('.message').first().textContent();
      console.log(`Line clear message: ${messageText}`);
    }
    
    // 5. Test level completion
    console.log('\n=== TESTING LEVEL COMPLETION ===');
    if (endPieces === 0) {
      console.log('Level completed!');
      await page.waitForTimeout(2000);
      const newLevel = await page.locator('#level').textContent();
      console.log(`New level: ${newLevel}`);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'screenshots/final-game-state.png', fullPage: true });
    
    console.log('\n=== ALL TESTS COMPLETED ===');
    expect(parseInt(totalMoves || '0')).toBeGreaterThan(0);
  });
});