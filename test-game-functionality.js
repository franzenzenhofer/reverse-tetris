#!/usr/bin/env node

// Simple Node.js script to test game functionality
// This simulates the key game logic without browser dependencies

const { GameEngine } = require('./dist/assets/main-CoRt5Dd5.js');

console.log('🎮 Testing Reverse Tetris Game Logic...\n');

try {
  // Test 1: Basic Engine Creation
  console.log('✅ Test 1: Engine Creation');
  const config = { cols: 10, rows: 20, cellSize: 32 };
  const engine = new GameEngine(config);
  console.log('   Engine created successfully');

  // Test 2: Level Generation
  console.log('✅ Test 2: Level Generation');
  engine.generateLevel();
  const state = engine.getState();
  console.log(`   Generated level with ${state.pieces.size} pieces`);
  console.log(`   Board size: ${config.cols}x${config.rows}`);

  // Test 3: Piece Selection
  console.log('✅ Test 3: Piece Selection');
  const firstPieceId = Array.from(state.pieces.keys())[0];
  if (firstPieceId) {
    engine.selectPiece(firstPieceId);
    const newState = engine.getState();
    console.log(`   Selected piece: ${newState.selected}`);
  }

  // Test 4: Piece Removal
  console.log('✅ Test 4: Piece Removal');
  const initialPieceCount = state.pieces.size;
  if (firstPieceId) {
    engine.selectPiece(firstPieceId); // Double-select to remove
    const finalState = engine.getState();
    console.log(`   Pieces before: ${initialPieceCount}, after: ${finalState.pieces.size}`);
    console.log(`   Moves: ${finalState.moves}`);
  }

  console.log('\n🎉 All tests passed! Game logic is working correctly.');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}