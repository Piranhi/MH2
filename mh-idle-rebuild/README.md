# Hunter Idle Rebuild

Fresh rebuild slice for the idle hunter game.

## Shape

- `src/game-core` contains the pure simulation, content, save schema, and tests.
- `src/game-ui` contains the React dashboard.
- `src/platform` contains browser-only adapters such as local save storage.

The core should not import DOM, browser storage, Steam APIs, or UI components.

## Commands

```powershell
npm install
npm run test
npm run build
npm run dev
```

## Current Slice

- 3 MVP areas.
- 6 regular monsters and 3 bosses.
- Simple auto hunt loop.
- Manual boss attempt unlocks the next area.
- XP, gold, renown, resources, equipment drops.
- Versioned save envelope.
- Offline simulation uses the same tick rules as online progress.
