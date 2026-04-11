# Code Conventions

## TypeScript / ESLint Rules
- **Semicolons**: Always required
- **Quotes**: Single quotes, double in JSX attributes
- **Braces**: Always required for if/else/for/while. Body on new line — no one-liner `if (x) { return; }`
- **Trailing commas**: Always (es5)
- **Max line length**: 120 characters
- **No `any`**: Use `unknown` + type narrowing, or proper generics
- **No `console.log`**: Use `console.warn`/`console.error` only
- **No unused variables**: Error (prefix with `_` if intentionally unused)
- **Prefer `const`**: `const` default, `let` only when needed, never `var`
- **Strict equality**: Always `===` / `!==`
- **Explicit return types**: Required on functions (except inline arrow callbacks)
- **Named exports only**: No default exports
- **Exhaustive switch**: All switch on union types must handle every case
- **No nested ternaries**: Use if/else

## Import Ordering (eslint enforced)
1. React / external libraries (react, zustand, dexie)
2. Internal modules (engine/, ai/, state/, renderer/)
3. Type imports (`import type { ... }`)
4. Styles (css)
Alphabetical within groups. Blank line between groups.

## File Naming
| Type | Pattern | Example |
|------|---------|---------|
| Components | PascalCase.tsx | GameScreen.tsx |
| Component logic | PascalCaseLogic.ts | GameScreenLogic.ts |
| Hooks | camelCase.ts | useTimer.ts |
| Services | camelCase.service.ts | gameSave.service.ts |
| Stores | camelCase.store.ts | game.store.ts |
| Engine/utils/renderer | camelCase.ts | drawBoard.ts |
| Tests | *.test.ts(x) | board.test.ts |

## Component Architecture
Every component has strict UI/Logic separation:
```
components/
  GameScreen/
    GameScreen.tsx         # Pure UI — JSX, styles, calls logic hook
    GameScreenLogic.ts     # All useState, useEffect, handlers, computed values
```
- `GameScreen.tsx` imports `useGameScreenLogic()` from `GameScreenLogic.ts`
- Component files: clean, declarative JSX only. No useState, useEffect, business logic.
- Logic hooks: all state, effects, event handlers, derived data.

## Prettier Config
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 120,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "jsxSingleQuote": false
}
```

## Testing Conventions
- Test files in `__tests__/` directories next to code
- `describe('ClassName/functionName', () => { it('should ...', () => {}); });`
- Arrange-Act-Assert pattern
- No test depends on another test's state
- Mock external dependencies, not internal modules
- E2E: page object pattern where applicable
- Every feature/fix must have unit + E2E tests

## Git Conventions
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`
- Branch naming: `feat/feature-name`, `fix/bug-name`, `chore/task-name`
- Small, focused commits — one logical change per commit
