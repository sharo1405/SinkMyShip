import { Component, computed, DestroyRef, inject } from '@angular/core';
import { GameStore } from '@core/services/game-store';
import { SetupStore } from '@core/services/setup-store';
import type { Board as GameBoard, Coord } from '@sinkmyship/game';
import { Button } from '@shared/ui/button/button';
import { Ship } from '@shared/ui/ship/ship';
import { formatClock } from '@shared/utils/format-clock';
import { Board } from '../../components/board/board';

const shipCells = (board: Readonly<GameBoard> | null): readonly Coord[] =>
  board?.ships.flatMap((s) => s.cells) ?? [];

/**
 * The battle screen: the player's board (row numbers on the left) with their ships beneath
 * it, and the computer's board (row numbers on the right), at the size chosen in setup.
 * Opening it starts a new game, so the computer's fleet is placed at random.
 *
 * Placement: pick a ship from the tray, then click its blocks one by one on your board.
 * While a ship is being placed, the top-left box counts the blocks still to go. Remove (once
 * a ship is down) lets the player click a placed ship to take it off again. The top-right
 * countdown gives five minutes; after that the missing ships are placed automatically.
 * `setupCompleteGuard` makes sure a board has been chosen before this page opens.
 */
@Component({
  selector: 'app-battle-page',
  imports: [Board, Button, Ship],
  styleUrl: './battle-page.scss',
  templateUrl: './battle-page.html',
})
export class BattlePage {
  private readonly setup = inject(SetupStore);
  protected readonly game = inject(GameStore);

  protected readonly size = computed(() => this.setup.boardOptionDef()?.size ?? null);
  protected readonly shipColor = computed(() => this.setup.shipColorDef()?.value ?? null);

  protected readonly playerShipCells = computed(() => shipCells(this.game.playerBoard()));
  /** Visible for now, while placement is being built; hidden once firing exists. */
  protected readonly computerShipCells = computed(() => shipCells(this.game.computerBoard()));

  protected readonly tray = computed(() => {
    const placed = this.game.placedShipIds();
    const selected = this.game.selectedShip()?.id;
    return this.game.fleet().map(({ id, length }) => ({
      id,
      length,
      placed: placed.has(id),
      selected: id === selected,
      label: `${length}-block ship${placed.has(id) ? ', placed' : ''}`,
    }));
  });
  /** The player's board takes clicks while ships are missing or one is being removed. */
  protected readonly boardInteractive = computed(
    () =>
      !this.game.placementOver() && (this.game.removing() || this.tray().some((s) => !s.placed)),
  );
  protected readonly timeLeft = computed(() => {
    const ms = this.game.timeLeftMs();
    return ms === null || this.game.placementOver() ? null : formatClock(ms);
  });

  constructor() {
    const size = this.size();
    if (size) this.game.newGame(size);
    inject(DestroyRef).onDestroy(() => this.game.stopClock());
  }
}
