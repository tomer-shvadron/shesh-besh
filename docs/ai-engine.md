# AI Engine

## Overview
The AI runs entirely in a Web Worker to keep the UI at 60fps.
It evaluates board positions using heuristics and selects moves based on difficulty.

## Board Evaluation (`evaluate.ts`)
`evaluateBoard(board, player)` returns a score from -1.0 (certain loss) to +1.0 (certain win).

### 8 Heuristics

1. **Pip Count** (weight: 0.25)
   Total pips (distance) remaining to bear off. Lower is better. Normalized against opponent's pip count.
   `score = (opponentPips - myPips) / (opponentPips + myPips)`

2. **Blot Exposure** (weight: 0.15)
   Number of blots (single checkers) that the opponent could hit given any dice roll.
   More exposed blots = lower score. Weighted by distance from home (farther = worse).

3. **Home Board Strength** (weight: 0.15)
   Number of "made points" (2+ checkers) in home board. More = better.
   Also helps trap opponent's checkers on the bar.

4. **Blocking Primes** (weight: 0.15)
   Consecutive made points. A 6-prime is extremely strong (opponent can't escape).
   Score: 2 consecutive = 0.2, 3 = 0.4, 4 = 0.7, 5 = 0.9, 6 = 1.0

5. **Bar Checkers** (weight: 0.10)
   Opponent checkers on bar = positive. Own checkers on bar = negative.
   Weighted more heavily when opponent has strong home board (harder to re-enter).

6. **Bearing Off Progress** (weight: 0.10)
   Number of checkers already borne off. Direct progress toward winning.

7. **Anchor Position** (weight: 0.05)
   Having an anchor (2+ checkers) in opponent's home board provides safety.
   Advanced anchors (points 4-5 in opponent's home) score higher.

8. **Race Detection** (weight: variable)
   When no contact between players' checkers (can't hit anymore),
   switch to pure pip count evaluation — only distance matters.

### Weight Profiles
- **Full weights**: All 8 heuristics with weights above — used by Hard difficulty
- **Simple weights**: Only pip count (0.5), blot exposure (0.25), home board (0.25) — used by Medium
- **Reduced weights**: Same as simple but with added noise — used by Easy (before random selection)

## Difficulty Strategies (`strategies.ts`)

### Easy
- Generate all legal move sequences
- Evaluate each with reduced weights
- Select randomly from the top 50% (weighted toward better moves)
- 30% chance of picking from the bottom 50% (deliberate "mistake")
- Target response time: <100ms

### Medium
- Generate all legal move sequences
- Evaluate each with simple weights (3 heuristics only)
- Always pick the best-scoring sequence
- No randomness
- Target response time: <200ms

### Hard
- Generate all legal move sequences
- For each candidate sequence:
  1. Apply the moves to get the resulting board
  2. For all 21 unique opponent dice rolls (6x6 → 21 unique):
     - Generate all legal opponent move sequences
     - Evaluate each with full weights
     - Take the best opponent response (minimax)
  3. Average the scores across all 21 dice outcomes (expectation)
- Pick the candidate with the highest expected value
- This is **1-ply expectiminimax**
- Target response time: <2 seconds

## Tuning
The weight values above are starting points. They should be tuned by:
1. Playing the AI against itself at various weight configurations
2. Testing against known backgammon positions where the correct move is established
3. Adjusting weights to produce moves that match expert play
