import { Shape } from '@/types/game';

export const COLS = 10;
export const ROWS = 20;

export const CELL_SIZE = typeof window !== 'undefined' 
  ? Math.min(
      Math.floor((window.innerWidth - 20) / COLS),
      Math.floor((window.innerHeight - 80) / ROWS),
      32
    )
  : 32;

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