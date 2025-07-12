import { Shape } from '@/types/game';

export const COLS = 10;
export const ROWS = 20;

export function calculateCellSize(): number {
  if (typeof window === 'undefined') return 32;
  
  // Get viewport dimensions accounting for safe areas
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate maximum cell size that fits in viewport
  // Leave some padding for UI elements
  const maxCellWidth = Math.floor((viewportWidth - 16) / COLS);
  const maxCellHeight = Math.floor((viewportHeight - 60) / ROWS);
  
  // Use the smaller dimension to ensure it fits
  return Math.min(maxCellWidth, maxCellHeight, 40);
}

export const CELL_SIZE = calculateCellSize();

export const SHAPES: Shape[] = [
  { name: 'I', cells: [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 3, y: 1}] },
  { name: 'O', cells: [{x: 1, y: 0}, {x: 2, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}] },
  { name: 'T', cells: [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 0}] },
  { name: 'S', cells: [{x: 0, y: 1}, {x: 1, y: 1}, {x: 1, y: 0}, {x: 2, y: 0}] },
  { name: 'Z', cells: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 2, y: 1}] },
  { name: 'L', cells: [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}, {x: 2, y: 0}] },
  { name: 'J', cells: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}] },
];

export const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#f1c40f', '#c0392b',
  '#2980b9', '#27ae60', '#d35400', '#8e44ad', '#16a085',
  '#7f8c8d', '#bdc3c7', '#95a5a6', '#2c3e50', '#ecf0f1'
];