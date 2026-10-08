# core/

App-wide singletons, instantiated once per application (per request under SSR).

| Folder      | What goes here                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `services/` | `@Service()` singletons (auto-provided in root). The game services are listed below.                                                                   |
| `guards/`   | Functional route guards (`CanActivateFn`), e.g. block `/battle` while the phase is `placing`.                                                          |
| `models/`   | UI-only types and `InjectionToken`s (config, RNG). Game types (`Coord`, `Seat`, `Phase`, ...) come from `@sinkmyship/game`. Never redeclare them here. |
| `utils/`    | Plain classes and functions used by services, e.g. `Countdown`.                                                                                        |

Each service, util and guard has its own folder, with its test beside it:
`services/game-store/game-store.ts` and `services/game-store/game-store.spec.ts`.

Add `interceptors/` when an HTTP backend exists.

## Game services

| Service             | Owns                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `GameStore`         | The game state. Wraps every rule call from `@sinkmyship/game`; no timers, no decisions.         |
| `PlayerPlacement`   | The player's placement: selected ship, blocks, Remove, Ready, the five-minute clock.            |
| `PlayerTurn`        | The player's battle turn: firing at the computer's board and the 10-second turn clock.          |
| `ComputerPlayer`    | The computer: random fleet, firing three seconds into its turn. Aiming is `chooseShot` (rules). |
| `MatchController`   | Starts a game and decides who acts next. Swap `ComputerPlayer` for a network seat here later.   |
| `ScoreKeeper`       | Each side's score, replayed from the game log through `scoreLog` (rules). Holds no state.       |
| `PlayerRadar`       | The player's Radar: aiming, the scan (`useRadar`, rules) and its `RADAR_REVEAL_MS` overlay.     |
| `PlayerRandomShots` | The player's Random shots: arming it, and the 5-shot volley (`useRandomShots`, rules) on Click. |
| `PlayerPowers`      | Which of the player's powers is active, so only one is on at a time.                            |

Placement, turn and computer services take an `onDone` callback from `MatchController` rather than
injecting it, so the dependencies only point one way.

### Shared by the player and the computer

Logic both sides need lives once, here, not in each service:

| File                        | Shared piece                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `models/seat-controller.ts` | `SeatController`: what any side implements to take a battle turn (`start`/`stop`). |
| `models/seats.ts`           | `PLAYER` and `COMPUTER` seat numbers.                                              |
| `utils/turn-handoff/`       | `TurnHandoff`: holds the "I'm finished" callback and calls it exactly once.        |
| `utils/countdown/`          | `Countdown`: the placement and turn clocks.                                        |
| `utils/platform/`           | `injectIsBrowser()`: clocks and computer moves only run in the browser.            |
| `GameStore.isTurnOf(seat)`  | Whether the battle is on and it's that seat's turn.                                |

## Rules

- **Imports allowed:** `@angular/*`, `rxjs`, `@sinkmyship/game`, `@shared/*` (utils/types only).
- **Must not import `@features/*`.** Core is depended on; it depends on nothing feature-specific.
- **No UI.** No components here. Features must not import anything from `core/` to render it.
- **SSR-safe.** Browser-only work (`localStorage`, timers that drive gameplay, `matchMedia`) goes behind
  `isPlatformBrowser(inject(PLATFORM_ID))` or in `afterNextRender`.
- **No rule logic.** Placement validity, turn legality and visibility live in `@sinkmyship/game`.
