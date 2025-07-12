import { beforeAll, afterEach, afterAll } from 'vitest';

// Mock DOM environment
beforeAll(() => {
  // Add canvas mock
  HTMLCanvasElement.prototype.getContext = () => {
    return {
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
    } as any;
  };
});

afterEach(() => {
  // Clean up after each test
  document.body.innerHTML = '';
});

afterAll(() => {
  // Final cleanup
});