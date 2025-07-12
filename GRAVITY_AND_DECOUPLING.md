# Gravity and Decoupling in Tetris

## 🌍 GRAVITY - How Pieces Fall

### Standard Tetris Gravity
In normal Tetris, pieces fall as complete units:
```
Before:          After gravity:
[T][T][T]        (empty)
   [T]           (empty)
_________        [T][T][T]
_________           [T]
```

### Reverse Tetris Gravity
When you remove a supporting piece, everything above falls:
```
   [L][L]           [L][L]
   [L]              [L]
   [L]              [L]
[X][X][X]        _________ (X removed, L falls)
```

## 🔗 DECOUPLING - When Pieces Break Apart

### The Problem
When you clear a line that goes THROUGH a piece, it can split:
```
Original T-piece:     Line clears:      Result:
   [T]                   [T]            [T] (floating)
[T][T][T]             [====]            ___ (line cleared)
                                        Split into separate pieces!
```

### Why Decoupling Matters
Without decoupling, you get invalid "floating" pieces:
```
BAD (without decoupling):     GOOD (with decoupling):
[T]   [T]  <- Connected?      [T]   [T]  <- Two separate pieces
                              Each falls independently
```

## 🎮 Real Example

```
Step 1: Original state
[O][O]  [Z][Z]
[O][O][Z][Z]
[■][■][_][■][■]  <- Almost complete line with gap

Step 2: Remove the O piece
        [Z][Z]
      [Z][Z]
[■][■][_][■][■]  <- O removed, Z falls into gap

Step 3: Line completes!
        [Z][Z]
      [=========]  <- LINE CLEAR!
                     Z gets cut in half!

Step 4: Decoupling happens
        [Z][Z]  <- Top part becomes separate piece
      (cleared)
        
Step 5: Gravity continues
        
        
        [Z][Z]  <- Falls to bottom
```

## 🔧 Implementation Details

### Checking Connectivity
After removing cells, check if remaining cells touch:
```
Original L:    Remove middle:    Check connectivity:
[L]            [L]               Group 1: [L]
[L]            [_]               Group 2: [L][L]
[L][L]         [L][L]            = 2 separate pieces!
```

### Algorithm
1. Remove cleared cells from piece
2. Find all connected groups using flood-fill
3. If multiple groups exist, create new pieces
4. Each new piece falls independently

### Edge Cases
- Single cell pieces (not allowed in Tetris!)
- Diagonal connections (don't count as connected)
- Pieces at board edges

## 🎯 Why This Matters for Gameplay

1. **More Cascades**: Decoupled pieces can trigger new line clears
2. **Strategic Depth**: Plan which pieces to split
3. **Realistic Physics**: Pieces don't magically float
4. **Puzzle Complexity**: Create setups that cascade multiple times

This makes Reverse Tetris more dynamic and satisfying!