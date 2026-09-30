# core/

App-wide singletons, instantiated once per application (per request under SSR).

| Folder      | What goes here                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| `services/` | `@Service()` singletons (auto-provided in root): `GameStore` (signal store over `@sinkmyship/game`), AI turn scheduler, persistence. |
| `guards/`   | Functional route guards (`CanActivateFn`), e.g. block `/battle` while the phase is `placing`.           |
| `models/`   | UI-only types and `InjectionToken`s (config, RNG). Game types (`Coord`, `Seat`, `Phase`, ...) come from `@sinkmyship/game`. Never redeclare them here. |

Add `interceptors/` when an HTTP backend exists.

## Rules

- **Imports allowed:** `@angular/*`, `rxjs`, `@sinkmyship/game`, `@shared/*` (utils/types only).
- **Must not import `@features/*`.** Core is depended on; it depends on nothing feature-specific.
- **No UI.** No components here. Features must not import anything from `core/` to render it.
- **SSR-safe.** Browser-only work (`localStorage`, timers that drive gameplay, `matchMedia`) goes behind
  `isPlatformBrowser(inject(PLATFORM_ID))` or in `afterNextRender`.
- **No rule logic.** Placement validity, turn legality and visibility live in `@sinkmyship/game`.
