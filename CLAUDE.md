# Shesh-Besh — Backgammon PWA

## Quick Reference
- **Package manager**: pnpm
- **Dev server**: `pnpm dev`
- **Build**: `pnpm build`
- **Unit tests**: `pnpm test`
- **E2E tests**: `pnpm test:e2e`
- **Lint**: `pnpm lint`
- **Typecheck**: `pnpm typecheck`

## Tech Stack
React + TypeScript + Vite + TailwindCSS + Zustand + Dexie.js (IndexedDB)
Canvas rendering for game board. Web Worker for AI. PWA with offline support.

## Architecture
- `src/engine/` — Pure TS game rules engine (Board, MoveValidator, GameController)
- `src/ai/` — AI player with 3 difficulties, runs in Web Worker
- `src/renderer/` — Canvas drawing functions + BoardCanvas React wrapper
- `src/components/` — React UI components (each with Component.tsx + ComponentLogic.ts)
- `src/state/` — Zustand stores (game.store.ts, settings.store.ts, highScore.store.ts)
- `src/services/` — Database, game save, sound services
- See `docs/` for detailed documentation.

## Key Conventions
- Named exports only (no default exports)
- Always semicolons, single quotes, trailing commas, 120 char lines
- Always curly braces on new lines for if/else/for/while
- No `any` — use `unknown` + narrowing or generics
- Components: PascalCase.tsx (UI only) + PascalCaseLogic.ts (all logic in hook)
- Stores: camelCase.store.ts | Services: camelCase.service.ts
- Imports: grouped (external → internal → types → styles), alphabetical
- Tests: __tests__/ folders, describe/it pattern, AAA
- Commits: conventional format (feat:, fix:, refactor:, test:, chore:, docs:)
- See `docs/conventions.md` for full rules.

## Game Rules
Standard backgammon. No doubling cube. Opening roll = each player rolls 1 die.
No legal moves = auto-skip. See `docs/game-rules.md` for all edge cases.

## Testing
- Every feature must have unit tests (vitest) AND E2E tests (Playwright)
- Canvas E2E testing: expose `window.__GAME_STATE__` in test mode
- CI runs lint + typecheck + unit + E2E before deploy
