# features/

One folder per lazy-loaded route area. The planned ones are:

- `setup/`: fleet placement
- `battle/`: both grids, log, stats
- `result/`: win/lose screen

Each feature exposes a route component loaded with `loadComponent` from `app.routes.ts`. Feature
components are the "smart" layer: they inject `GameStore` from `@core/*` and compose `@shared/*` UI.

## Rules

- **May import** `@core/*`, `@shared/*`, `@sinkmyship/game`.
- **Must not import another feature.** Move shared pieces to `shared/` or state to `core/`.
- **Nothing outside `features/` imports from it** except the lazy `loadComponent` calls in `app.routes.ts`.
- **No rule logic in components.** Use `canPlace()`, `fire()` and `viewFor()` through the store.
