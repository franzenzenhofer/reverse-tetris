import { GameState, GameConfig, GAME_EVENTS } from '@/types/game';
import { SHAPES, COLORS } from './constants';
import { Piece } from './Piece';

export class GameEngine extends EventTarget {
  private state: GameState;
  private config: GameConfig;

  constructor(config: GameConfig) {
    super();
    this.config = config;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      board: Array(this.config.rows).fill(null).map(() => Array(this.config.cols).fill(null)),
      pieces: new Map(),
      selected: null,
      moves: 0,
      level: 1,
      animating: false,
      processingCascades: false,
      score: 0,
      combo: 0,
      corruptionLevel: 0,
      gameOver: false,
      timeRemaining: 120000, // 120 seconds per level
      lastMoveTime: Date.now(),
    };
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  selectPiece(pieceId: number | null): void {
    if (this.state.animating) return;
    
    if (pieceId === this.state.selected) {
      this.removePiece(pieceId);
    } else {
      this.state.selected = pieceId;
      this.dispatchEvent(new CustomEvent(GAME_EVENTS.PIECE_SELECTED, { 
        detail: { pieceId } 
      }));
    }
  }

  removePiece(pieceId: number | null): void {
    if (!pieceId || this.state.animating || this.state.gameOver) return;
    
    this.state.animating = true;
    const piece = this.state.pieces.get(pieceId);
    
    if (!piece) {
      this.state.animating = false;
      return;
    }

    // Calculate score based on piece size and combo
    const baseScore = piece.cells.length * 10;
    const comboMultiplier = 1 + (this.state.combo * 0.5);
    const timeBonus = this.calculateTimeBonus();
    const scoreGain = Math.floor(baseScore * comboMultiplier * timeBonus);
    
    this.state.score += scoreGain;
    this.state.combo++;
    this.state.lastMoveTime = Date.now();

    // Clear from board
    piece.cells.forEach(cell => {
      this.state.board[cell.y][cell.x] = null;
    });

    // Remove piece
    this.state.pieces.delete(pieceId);
    this.state.moves++;
    this.state.selected = null;

    this.dispatchEvent(new CustomEvent(GAME_EVENTS.PIECE_REMOVED, { 
      detail: { pieceId, moves: this.state.moves, score: scoreGain } 
    }));
    
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.SCORE_UPDATE, {
      detail: { score: this.state.score, scoreGain }
    }));
    
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.COMBO_UPDATE, {
      detail: { combo: this.state.combo }
    }));

    // Reset animating immediately after piece removal
    this.state.animating = false;
    
    // Process cascading effects asynchronously to prevent UI freeze
    setTimeout(() => {
      // Prevent multiple cascade processes
      if (this.state.processingCascades) return;
      
      this.state.processingCascades = true;
      this.processCascades();
      
      // Push back corruption when removing pieces
      if (this.state.corruptionLevel > 0) {
        this.state.corruptionLevel = Math.max(0, this.state.corruptionLevel - 0.5);
      }
      
      if (this.state.pieces.size === 0) {
        this.handleLevelComplete();
      }
      
      this.state.processingCascades = false;
    }, 100);
  }

  private applyGravity(): boolean {
    let changed = true;
    let anyPieceFell = false;
    
    while (changed) {
      changed = false;
      
      const sortedPieces = Array.from(this.state.pieces.values()).sort((a, b) => 
        b.getBottomY() - a.getBottomY()
      );
      
      for (const piece of sortedPieces) {
        // Clear current position
        piece.cells.forEach(cell => {
          if (this.state.board[cell.y][cell.x] === piece.id) {
            this.state.board[cell.y][cell.x] = null;
          }
        });
        
        // Find fall distance
        let fallDistance = 0;
        while (piece.canMoveTo(this.state.board, 0, fallDistance + 1)) {
          fallDistance++;
        }
        
        if (fallDistance > 0) {
          piece.moveTo(0, fallDistance);
          changed = true;
          anyPieceFell = true;
        }
        
        // Place in new position
        piece.cells.forEach(cell => {
          this.state.board[cell.y][cell.x] = piece.id;
        });
      }
    }
    
    this.dispatchEvent(new Event(GAME_EVENTS.GRAVITY_APPLIED));
    return anyPieceFell;
  }

  private clearFullLines(): void {
    // Check BOTH full horizontal lines AND left-to-right paths
    const fullLines = this.findFullHorizontalLines();
    const leftRightPaths = this.findLeftToRightPaths();
    
    // Combine both types of clears
    const allPaths = [...fullLines, ...leftRightPaths];
    
    if (allPaths.length === 0) return;
    
    console.log(`Line clear detected! Full lines: ${fullLines.length}, Paths: ${leftRightPaths.length}`);
    
    // Calculate line clear bonus
    const lineBonus = allPaths.length * 100 * (1 + this.state.combo);
    const totalCells = allPaths.reduce((sum, path) => sum + path.length, 0);
    const cellBonus = totalCells * 5;
    const totalBonus = lineBonus + cellBonus;
    
    this.state.score += totalBonus;
    this.state.combo += allPaths.length; // Extra combo for line clears
    
    // Trigger path clear animation with path data
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.LINE_CLEARED, { 
      detail: { 
        paths: allPaths,
        pathCount: allPaths.length,
        totalCells: totalCells,
        bonus: totalBonus
      } 
    }));
    
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.SCORE_UPDATE, {
      detail: { score: this.state.score, scoreGain: totalBonus }
    }));
    
    // Remove cells from paths immediately (no setTimeout to avoid freeze)
    const cellsToRemove = new Set<string>();
    
    allPaths.forEach(path => {
      path.forEach(cell => {
        cellsToRemove.add(`${cell.x},${cell.y}`);
        this.state.board[cell.y][cell.x] = null;
      });
    });
    
    // Update pieces - remove cells that were cleared and handle decoupling
    const piecesToCheck: Array<Piece> = [];
    
    for (const piece of this.state.pieces.values()) {
      const remainingCells = piece.cells.filter(cell => 
        !cellsToRemove.has(`${cell.x},${cell.y}`)
      );
      
      if (remainingCells.length === 0) {
        this.state.pieces.delete(piece.id);
      } else if (remainingCells.length < piece.cells.length) {
        // Cells were removed, need to check for decoupling
        piece.cells = remainingCells;
        piecesToCheck.push(piece as Piece);
      }
    }
    
    // Handle piece decoupling
    this.handlePieceDecoupling(piecesToCheck);
    
    console.log(`Cleared ${cellsToRemove.size} cells, ${this.state.pieces.size} pieces remaining`);
  }

  private findFullHorizontalLines(): Array<Array<{x: number, y: number}>> {
    const fullLines: Array<Array<{x: number, y: number}>> = [];
    
    for (let y = 0; y < this.config.rows; y++) {
      const row = this.state.board[y];
      
      // Check if row is completely filled
      if (row.every(cell => cell !== null)) {
        const line: Array<{x: number, y: number}> = [];
        for (let x = 0; x < this.config.cols; x++) {
          line.push({ x, y });
        }
        fullLines.push(line);
      }
    }
    
    return fullLines;
  }

  private findConnectedPaths(): Array<Array<{x: number, y: number}>> {
    const paths: Array<Array<{x: number, y: number}>> = [];
    const visited = new Set<string>();
    
    // Look for substantial connected regions that span significant width
    for (let y = 0; y < this.config.rows; y++) {
      for (let x = 0; x < this.config.cols; x++) {
        if (this.state.board[y][x] !== null && !visited.has(`${x},${y}`)) {
          const connectedRegion = this.findConnectedRegion(x, y, visited);
          
          // Only clear if the region spans at least 70% of the width
          const minX = Math.min(...connectedRegion.map(cell => cell.x));
          const maxX = Math.max(...connectedRegion.map(cell => cell.x));
          const width = maxX - minX + 1;
          
          if (width >= Math.floor(this.config.cols * 0.7) && connectedRegion.length >= 3) {
            paths.push(connectedRegion);
            connectedRegion.forEach(cell => visited.add(`${cell.x},${cell.y}`));
          }
        }
      }
    }
    
    return paths;
  }

  private findConnectedRegion(startX: number, startY: number, globalVisited: Set<string>): Array<{x: number, y: number}> {
    const region: Array<{x: number, y: number}> = [];
    const localVisited = new Set<string>();
    const stack = [{ x: startX, y: startY }];
    
    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const key = `${x},${y}`;
      
      if (localVisited.has(key) || globalVisited.has(key) ||
          x < 0 || x >= this.config.cols || y < 0 || y >= this.config.rows ||
          this.state.board[y][x] === null) {
        continue;
      }
      
      localVisited.add(key);
      region.push({ x, y });
      
      // Add all 4 adjacent cells
      stack.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      );
    }
    
    return region;
  }

  private findLeftToRightPaths(): Array<Array<{x: number, y: number}>> {
    const paths: Array<Array<{x: number, y: number}>> = [];
    const visited = new Set<string>();
    
    // Check each row for potential starting points on the left
    for (let y = 0; y < this.config.rows; y++) {
      if (this.state.board[y][0] !== null) {
        const path = this.tracePath(0, y, visited);
        if (path.length > 0 && this.pathReachesRightSide(path)) {
          paths.push(path);
          // Mark all cells in this path as visited
          path.forEach(cell => visited.add(`${cell.x},${cell.y}`));
        }
      }
    }
    
    return paths;
  }

  private tracePath(startX: number, startY: number, globalVisited: Set<string>): Array<{x: number, y: number}> {
    const visited = new Set<string>();
    const path: Array<{x: number, y: number}> = [];
    
    const dfs = (x: number, y: number, prevX: number): boolean => {
      const key = `${x},${y}`;
      
      // Check bounds and if already visited
      if (x < 0 || x >= this.config.cols || y < 0 || y >= this.config.rows ||
          visited.has(key) || globalVisited.has(key) || this.state.board[y][x] === null) {
        return false;
      }
      
      // STRICT LEFT-TO-RIGHT: Never go left (backward)
      if (x < prevX) {
        return false;
      }
      
      visited.add(key);
      path.push({ x, y });
      
      // If we reached the right side, success!
      if (x === this.config.cols - 1) {
        return true;
      }
      
      // Try directions in order: right (preferred), down, up
      // NO LEFT movement allowed - strictly left-to-right progression
      const directions = [
        { dx: 1, dy: 0 },   // Right (preferred)
        { dx: 0, dy: 1 },   // Down (for walk-arounds)
        { dx: 0, dy: -1 },  // Up (for walk-arounds)
      ];
      
      for (const dir of directions) {
        if (dfs(x + dir.dx, y + dir.dy, x)) {
          return true;
        }
      }
      
      // Backtrack
      path.pop();
      visited.delete(key);
      return false;
    };
    
    dfs(startX, startY, -1); // Start with prevX = -1 to allow first move
    return path;
  }

  private pathReachesRightSide(path: Array<{x: number, y: number}>): boolean {
    return path.some(cell => cell.x === this.config.cols - 1);
  }

  private applyGravityWithAnimation(): void {
    const fallingPieces = new Map<number, { from: number; to: number }>();
    
    let changed = true;
    while (changed) {
      changed = false;
      
      const sortedPieces = Array.from(this.state.pieces.values()).sort((a, b) => 
        b.getBottomY() - a.getBottomY()
      );
      
      for (const piece of sortedPieces) {
        // Clear current position
        const originalBottomY = piece.getBottomY();
        piece.cells.forEach(cell => {
          if (this.state.board[cell.y][cell.x] === piece.id) {
            this.state.board[cell.y][cell.x] = null;
          }
        });
        
        // Find fall distance
        let fallDistance = 0;
        while (piece.canMoveTo(this.state.board, 0, fallDistance + 1)) {
          fallDistance++;
        }
        
        if (fallDistance > 0) {
          // Record falling animation data
          fallingPieces.set(piece.id, {
            from: originalBottomY,
            to: originalBottomY + fallDistance
          });
          
          piece.moveTo(0, fallDistance);
          changed = true;
        }
        
        // Place in new position
        piece.cells.forEach(cell => {
          this.state.board[cell.y][cell.x] = piece.id;
        });
      }
    }
    
    // Trigger falling animation if pieces moved
    if (fallingPieces.size > 0) {
      this.dispatchEvent(new CustomEvent(GAME_EVENTS.GRAVITY_APPLIED, {
        detail: { fallingPieces }
      }));
    }
  }

  private handleLevelComplete(): void {
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.LEVEL_COMPLETE, { 
      detail: { level: this.state.level, moves: this.state.moves } 
    }));
    
    setTimeout(() => {
      this.state.level++;
      this.generateLevel();
    }, 1500);
  }

  generateLevel(): void {
    const currentLevel = this.state.level || 1;
    this.state = this.createInitialState();
    this.state.level = currentLevel;
    
    let nextId = 1;
    
    // STRATEGIC LEVEL GENERATION - ALWAYS CREATES LINE CLEAR OPPORTUNITIES
    
    // Step 1: Create multiple almost-complete lines with strategic gaps
    const bottomRow = this.config.rows - 1;
    const numLines = Math.min(3, Math.floor((currentLevel + 2) / 3)); // 1-3 lines based on level
    
    // Create strategic gap patterns
    const gapPatterns = [
      [4], // Single gap in middle
      [2, 7], // Two gaps for more complex clearing
      [1, 5, 8], // Three gaps for cascading opportunities
      [3, 6], // Two gaps close together
      [0, 9], // Edge gaps
      [4, 5] // Adjacent gaps for interesting patterns
    ];
    
    const patternIndex = (currentLevel - 1) % gapPatterns.length;
    const gaps = gapPatterns[patternIndex];
    
    const squareShape = SHAPES.find(s => s.name === 'O'); // 2x2 square
    const iShape = SHAPES.find(s => s.name === 'I'); // 4-block line
    if (!squareShape || !iShape) return;
    
    // Create strategic bottom line with guaranteed clear opportunity
    for (let lineNum = 0; lineNum < numLines; lineNum++) {
      const lineY = bottomRow - (lineNum * 4); // Space lines apart
      
      // Fill line strategically with I-pieces and squares, leaving gaps
      let x = 0;
      while (x < this.config.cols) {
        if (gaps.some(gap => gap >= x && gap < x + 4)) {
          // Skip area around gaps
          x++;
          continue;
        }
        
        // Try to place an I-piece horizontally
        if (x + 3 < this.config.cols && !gaps.some(gap => gap >= x && gap <= x + 3)) {
          const piece = new Piece(nextId, iShape, COLORS[(nextId - 1) % COLORS.length], x, lineY);
          if (this.canPlacePiece(piece)) {
            piece.cells.forEach(cell => {
              this.state.board[cell.y][cell.x] = nextId;
            });
            this.state.pieces.set(nextId, piece);
            nextId++;
            x += 4;
            continue;
          }
        }
        
        // Otherwise try a square
        if (x + 1 < this.config.cols && !gaps.includes(x) && !gaps.includes(x + 1)) {
          const piece = new Piece(nextId, squareShape, COLORS[(nextId - 1) % COLORS.length], x, lineY - 1);
          if (this.canPlacePiece(piece)) {
            piece.cells.forEach(cell => {
              this.state.board[cell.y][cell.x] = nextId;
            });
            this.state.pieces.set(nextId, piece);
            nextId++;
            x += 2;
            continue;
          }
        }
        
        x++;
      }
    }
    
    // Step 2: Place KEY BLOCKS above EACH gap for guaranteed clears
    gaps.forEach((gapX, index) => {
      const keyBlockY = bottomRow - 2 - (index * 2); // Stagger heights
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
      const shapes = [squareShape, SHAPES.find(s => s.name === 'T'), SHAPES.find(s => s.name === 'L')];
      const shape = shapes[index % shapes.length] || squareShape;
      
      const keyBlock = new Piece(nextId, shape, colors[index % colors.length], gapX, keyBlockY);
      
      if (this.canPlacePiece(keyBlock)) {
        keyBlock.cells.forEach(cell => {
          this.state.board[cell.y][cell.x] = nextId;
        });
        this.state.pieces.set(nextId, keyBlock);
        nextId++;
        
        // Add cascade piece above key block
        const cascadeY = keyBlockY - 3;
        if (cascadeY >= 0) {
          const cascadePiece = new Piece(
            nextId, 
            squareShape, 
            COLORS[(nextId - 1) % COLORS.length], 
            gapX, 
            cascadeY
          );
          
          if (this.canPlacePiece(cascadePiece)) {
            cascadePiece.cells.forEach(cell => {
              this.state.board[cell.y][cell.x] = nextId;
            });
            this.state.pieces.set(nextId, cascadePiece);
            nextId++;
          }
        }
      }
    });
    
    // Step 3: Add supporting structures for interesting cascades
    const shapes = [...SHAPES];
    const usedPositions = new Set<string>();
    
    // Add 3-7 additional pieces based on level
    const extraPieces = 3 + Math.floor(currentLevel / 2);
    for (let i = 0; i < extraPieces && nextId < 20; i++) {
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 20) {
        const x = Math.floor(Math.random() * (this.config.cols - 3));
        const y = Math.floor(Math.random() * 10) + 5; // Middle area
        const posKey = `${x},${y}`;
        
        if (!usedPositions.has(posKey)) {
          const piece = new Piece(nextId, shape, COLORS[(nextId - 1) % COLORS.length], x, y);
          if (this.canPlacePiece(piece)) {
            piece.cells.forEach(cell => {
              this.state.board[cell.y][cell.x] = nextId;
              usedPositions.add(`${cell.x},${cell.y}`);
            });
            this.state.pieces.set(nextId, piece);
            nextId++;
            placed = true;
          }
        }
        attempts++;
      }
    }
    
    
    // Apply gravity to settle everything
    this.applyGravity();
    
    console.log(`Level ${currentLevel} generated with ${this.state.pieces.size} pieces. Gaps at: ${gaps.join(', ')}`);
  }
  
  private canPlacePiece(piece: Piece): boolean {
    return piece.cells.every(cell => 
      cell.x >= 0 && cell.x < this.config.cols && 
      cell.y >= 0 && cell.y < this.config.rows &&
      !this.state.board[cell.y]?.[cell.x]
    );
  }

  setLevel(level: number): void {
    this.state.level = level;
  }

  reset(): void {
    this.state = this.createInitialState();
    this.generateLevel();
  }

  private processCascades(): void {
    let changed = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      // Check for line clears
      this.clearFullLines();
      
      // Apply gravity
      const hadFalling = this.applyGravity();
      
      // If pieces fell, we need to check for more line clears
      if (hadFalling) {
        changed = true;
      }
    }
    
    console.log(`Cascade complete after ${iterations} iterations`);
  }

  private handlePieceDecoupling(pieces: Piece[]): void {
    let nextId = Math.max(...Array.from(this.state.pieces.keys())) + 1;
    
    pieces.forEach(piece => {
      const connectedGroups = this.findConnectedCellGroups(piece.cells);
      
      if (connectedGroups.length > 1) {
        console.log(`🔗 DECOUPLING: Piece ${piece.id} split into ${connectedGroups.length} pieces!`);
        
        // First, clear the original piece from the board
        piece.cells.forEach(cell => {
          if (this.state.board[cell.y][cell.x] === piece.id) {
            this.state.board[cell.y][cell.x] = null;
          }
        });
        
        // Remove original piece
        this.state.pieces.delete(piece.id);
        
        // Create new pieces for each connected group
        connectedGroups.forEach((group, index) => {
          const pieceId = index === 0 ? piece.id : nextId++;
          const newPiece = new Piece(
            pieceId,
            piece.shape,
            piece.color,
            0, 0 // Position will be determined by cells
          );
          newPiece.cells = group;
          this.state.pieces.set(newPiece.id, newPiece);
          
          // Update board with new piece IDs
          group.forEach(cell => {
            this.state.board[cell.y][cell.x] = pieceId;
          });
        });
      }
    });
  }

  private findConnectedCellGroups(cells: Array<{x: number, y: number}>): Array<Array<{x: number, y: number}>> {
    const groups: Array<Array<{x: number, y: number}>> = [];
    const visited = new Set<string>();
    
    cells.forEach(startCell => {
      const key = `${startCell.x},${startCell.y}`;
      if (!visited.has(key)) {
        const group = this.getConnectedCells(startCell, cells, visited);
        if (group.length > 0) {
          groups.push(group);
        }
      }
    });
    
    return groups;
  }

  private getConnectedCells(
    startCell: {x: number, y: number}, 
    allCells: Array<{x: number, y: number}>, 
    visited: Set<string>
  ): Array<{x: number, y: number}> {
    const group: Array<{x: number, y: number}> = [];
    const stack = [startCell];
    const cellSet = new Set(allCells.map(c => `${c.x},${c.y}`));
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = `${current.x},${current.y}`;
      
      if (visited.has(key)) continue;
      
      visited.add(key);
      group.push(current);
      
      // Check 4 adjacent cells
      const adjacent = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ];
      
      adjacent.forEach(adj => {
        const adjKey = `${adj.x},${adj.y}`;
        if (cellSet.has(adjKey) && !visited.has(adjKey)) {
          stack.push(adj);
        }
      });
    }
    
    return group;
  }

  private calculateTimeBonus(): number {
    const timeSinceLastMove = Date.now() - this.state.lastMoveTime;
    if (timeSinceLastMove < 1000) return 2.0; // Super fast bonus
    if (timeSinceLastMove < 2000) return 1.5; // Fast bonus
    if (timeSinceLastMove < 5000) return 1.2; // Quick bonus
    return 1.0; // Normal
  }

  update(deltaTime: number): void {
    if (this.state.gameOver) return;
    
    // Update timer
    this.state.timeRemaining = Math.max(0, this.state.timeRemaining - deltaTime);
    
    // Check for time out
    if (this.state.timeRemaining <= 0) {
      this.handleGameOver();
      return;
    }
    
    // Reset combo if no moves for 3 seconds
    if (Date.now() - this.state.lastMoveTime > 3000 && this.state.combo > 0) {
      this.state.combo = 0;
      this.dispatchEvent(new CustomEvent(GAME_EVENTS.COMBO_UPDATE, {
        detail: { combo: 0 }
      }));
    }
    
    // Rise corruption based on time and level (much slower rate)
    const corruptionRate = 0.00001 * this.state.level * deltaTime; // 100x slower
    this.state.corruptionLevel = Math.min(this.config.rows - 5, this.state.corruptionLevel + corruptionRate);
    
    // Apply corruption to board
    this.applyCorruption();
    
    // Spawn new pieces periodically
    if (Math.random() < 0.001 * this.state.level && this.state.pieces.size < 30) {
      this.spawnNewPiece();
    }
    
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.TIME_UPDATE, {
      detail: { 
        timeRemaining: this.state.timeRemaining,
        corruptionLevel: this.state.corruptionLevel
      }
    }));
  }

  private applyCorruption(): void {
    const corruptionHeight = Math.floor(this.state.corruptionLevel);
    if (corruptionHeight <= 0) return;
    
    // Check if corruption would hit any pieces
    const bottomRow = this.config.rows - corruptionHeight - 1;
    for (let x = 0; x < this.config.cols; x++) {
      if (this.state.board[bottomRow]?.[x] !== null) {
        // Corruption hit a piece - game over!
        this.handleGameOver();
        return;
      }
    }
    
    // Visual corruption will be handled by renderer
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.CORRUPTION_RISE, {
      detail: { level: this.state.corruptionLevel }
    }));
  }

  private spawnNewPiece(): void {
    const shapes = [...SHAPES];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const x = Math.floor(Math.random() * (this.config.cols - 4));
    const y = 0;
    
    const nextId = Math.max(...Array.from(this.state.pieces.keys()), 0) + 1;
    const piece = new Piece(nextId, shape, COLORS[(nextId - 1) % COLORS.length], x, y);
    
    if (this.canPlacePiece(piece)) {
      piece.cells.forEach(cell => {
        this.state.board[cell.y][cell.x] = nextId;
      });
      this.state.pieces.set(nextId, piece);
      
      this.dispatchEvent(new CustomEvent(GAME_EVENTS.NEW_PIECE_SPAWNED, {
        detail: { pieceId: nextId }
      }));
      
      // Apply gravity to new piece
      this.applyGravity();
    } else {
      // Can't place new piece - game over!
      this.handleGameOver();
    }
  }

  private handleGameOver(): void {
    this.state.gameOver = true;
    this.dispatchEvent(new CustomEvent(GAME_EVENTS.GAME_OVER, {
      detail: { 
        score: this.state.score,
        level: this.state.level,
        moves: this.state.moves
      }
    }));
  }

  startNewGame(): void {
    this.state = this.createInitialState();
    this.generateLevel();
  }
}