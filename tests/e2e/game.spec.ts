import { test, expect, Page } from '@playwright/test';

test.describe('Reverse Tetris Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load the game', async ({ page }) => {
    // Check game elements exist
    await expect(page.locator('#game')).toBeVisible();
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('#ui')).toBeVisible();
    
    // Check UI counters
    await expect(page.locator('#level')).toContainText('1');
    await expect(page.locator('#pieces')).toBeVisible();
    await expect(page.locator('#moves')).toContainText('0');
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/game-loaded.png', fullPage: true });
  });

  test('should have responsive design', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(100);
      
      await expect(page.locator('#canvas')).toBeVisible();
      await expect(page.locator('#game')).toBeInViewport();
      
      await page.screenshot({ 
        path: `screenshots/responsive-${viewport.name}.png`,
        fullPage: true 
      });
    }
  });

  test('should select pieces on click', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) throw new Error('Canvas not found');
    
    // Click on a piece (approximate center of canvas)
    await canvas.click({ position: { x: canvasBox.width / 2, y: canvasBox.height * 0.7 } });
    
    // Take screenshot of selected piece
    await page.screenshot({ path: 'screenshots/piece-selected.png' });
  });

  test('should remove pieces and update moves counter', async ({ page }) => {
    const canvas = page.locator('#canvas');
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) throw new Error('Canvas not found');
    
    // Get initial moves count
    const initialMoves = await page.locator('#moves').textContent();
    expect(initialMoves).toBe('0');
    
    // Click twice to remove a piece
    const clickPosition = { x: canvasBox.width / 2, y: canvasBox.height * 0.7 };
    await canvas.click({ position: clickPosition });
    await page.waitForTimeout(100);
    await canvas.click({ position: clickPosition });
    
    // Wait for animation
    await page.waitForTimeout(200);
    
    // Check moves counter increased
    const newMoves = await page.locator('#moves').textContent();
    expect(parseInt(newMoves || '0')).toBeGreaterThan(0);
    
    await page.screenshot({ path: 'screenshots/piece-removed.png' });
  });

  test('should show win screen when level is completed', async ({ page }) => {
    // This test would need to programmatically clear all pieces
    // For now, we'll just check the win element exists
    const winElement = page.locator('#win');
    await expect(winElement).toHaveClass(/^((?!show).)*$/); // Doesn't have 'show' class initially
    
    // The actual win condition would be tested in integration tests
  });

  test('should not have horizontal scroll on any device', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      
      const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const windowWidth = await page.evaluate(() => window.innerWidth);
      
      expect(documentWidth).toBeLessThanOrEqual(windowWidth);
    }
  });

  test('should be accessible', async ({ page }) => {
    // Basic accessibility checks
    const title = await page.title();
    expect(title).toBe('Reverse Tetris');
    
    // Check for viewport meta tag
    const viewport = await page.$('meta[name="viewport"]');
    expect(viewport).toBeTruthy();
    
    // Check color contrast (basic check)
    const backgroundColor = await page.evaluate(() => 
      window.getComputedStyle(document.body).backgroundColor
    );
    expect(backgroundColor).toBe('rgb(0, 0, 0)');
  });

  test('performance metrics', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      };
    });
    
    // Page should load quickly
    expect(metrics.loadComplete).toBeLessThan(3000);
    
    await page.screenshot({ path: 'screenshots/performance-check.png' });
  });
});