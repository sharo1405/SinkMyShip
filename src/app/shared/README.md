# shared/

Reusable, stateless building blocks with no knowledge of any particular screen.

| Folder        | What goes here                                                                          |
| ------------- | --------------------------------------------------------------------------------------- |
| `ui/`         | Presentational components (grid, cell, ship-tray, button): `input()` in, `output()` out. |
| `directives/` | Attribute directives, e.g. roving-focus for the grid.                                   |
| `pipes/`      | Pure pipes, e.g. coordinate formatting (`B7`).                                          |
| `utils/`      | Pure functions with no Angular dependency.                                              |

## Rules

- **Must not import `@features/*` or `@core/*`.** Shared code takes data through inputs and never
  injects app services. That keeps it trivially testable and reusable.
- **Types come from `@sinkmyship/game`**, not from a local redeclaration.
- **Stateless and `OnPush`.** Give components primitive inputs (`mark`, `label`), not whole boards.
- **Hidden information stays hidden.** Enemy grids render from `OpponentView`, never from a raw `Board`.
- Keep component styles under the 4kB budget.
