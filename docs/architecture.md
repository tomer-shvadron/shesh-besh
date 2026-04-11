# Architecture

## Overview
Shesh-Besh is an offline-first PWA backgammon game. The architecture is split into
four layers: Game Engine, AI, Renderer, and UI.

## Layers

### Game Engine (`src/engine/`)
Pure TypeScript — zero React or DOM dependency. Fully unit-testable.
- `board.ts` — Immutable board state. `applyMove()` returns new Board instance.
  Enables undo (history stack) and safe AI tree exploration.
- `moveValidator.ts` — Legal move generation. Most complex piece.
  Handles bar entry, bearing off, must-use-both-dice rule, doubles (4 moves).
  Returns complete move sequences, not individual moves.
- `gameController.ts` — Orchestrates turn flow: opening roll → roll → move → confirm → switch.
  Manages undo stack, win detection, auto-skip when no legal moves.
- `dice.ts` — Random dice generation, doubles detection, opening roll.

### AI Engine (`src/ai/`)
Runs entirely in a Web Worker (`ai.worker.ts`) to keep UI at 60fps.
- `evaluate.ts` — Board evaluation with 8 heuristics (see docs/ai-engine.md)
- `aiPlayer.ts` — Move selection: Easy (random-weighted), Medium (greedy), Hard (1-ply expectiminimax)
- `ai.worker.ts` — Worker entry point. Receives board+dice, returns chosen moves.

### Renderer (`src/renderer/`)
HTML5 Canvas rendering — single canvas element, no DOM for board.
- All draw functions are pure: `(ctx, state, dimensions, theme) → void`
- Game loop via `requestAnimationFrame`, pauses when idle
- `hitTest.ts` maps canvas (x,y) to board positions for click/tap interaction
- Two theme modes (dark/light) and two texture modes (realistic images / programmatic gradients)
- Retina-aware: canvas sized at `CSS × devicePixelRatio`

### UI Layer (`src/components/`)
React components for non-board UI (buttons, dialogs, panels).
- Every component split into `Component.tsx` (pure UI) + `ComponentLogic.ts` (hook with all logic)
- Responsive: mobile landscape (thin bars + full canvas) vs desktop (side panels + move history)
- TailwindCSS for styling. Theme via CSS custom properties.

## State Management
Zustand with 3 stores:
- `game.store.ts` — Board state, dice, current player, move history, phase, timer.
  Canvas game loop reads via `getState()` (no React re-renders).
- `settings.store.ts` — Theme, difficulty, sound, texture mode. Persisted to IndexedDB.
- `highScore.store.ts` — Win/loss stats + leaderboard. Persisted to IndexedDB.

## Persistent Storage
IndexedDB via Dexie.js (3 tables):
- `activeGame` — Auto-saved on every move. Single slot (id = "current").
- `highScores` — Auto-incrementing entries with score, difficulty, date, duration.
- `settings` — Single row (id = "current") with all preferences.

## Data Flow
```
User tap on Canvas
  → hitTest maps (x,y) to board point
  → game.store.selectPoint(index)
  → MoveValidator checks legality
  → game.store updates board (Board.applyMove)
  → game loop redraws canvas with new state
  → After confirm: switch player
  → If AI turn: post board to Web Worker
  → Worker runs evaluation, returns moves
  → game.store applies AI moves with animation
  → Canvas animates checker movement
  → Auto-save to IndexedDB
```

## PWA
- `vite-plugin-pwa` with autoUpdate strategy
- Service worker precaches all assets (JS, CSS, HTML, images, sounds)
- No runtime network requests — fully offline after install
- Manifest: landscape, fullscreen, theme colors
- Orientation lock via Screen Orientation API (mobile)

## CI/CD
GitHub Actions: 3 parallel jobs (lint+typecheck, unit test, e2e test) → deploy to GitHub Pages.
Deploy only on push to main when all jobs pass.
