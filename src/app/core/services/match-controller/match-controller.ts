import { DestroyRef, inject, Service } from '@angular/core';
import type { SeatController } from '@core/models/seat-controller';
import { ComputerPlayer } from '@core/services/computer-player/computer-player';
import { GameStore } from '@core/services/game-store/game-store';
import { PlayerPlacement } from '@core/services/player-placement/player-placement';
import { PlayerTurn } from '@core/services/player-turn/player-turn';
import type { BoardSize } from '@sinkmyship/game';

/**
 * Runs a match from start to finish: sets up a new game, hands placement to the player,
 * starts the battle when placement ends, and then gives the turn to whichever seat is up
 * until someone wins. Seats are `SeatController`s, so a network opponent can replace the
 * computer by swapping one entry in `seats`.
 */
@Service()
export class MatchController {
  private readonly game = inject(GameStore);
  private readonly placement = inject(PlayerPlacement);
  private readonly computer = inject(ComputerPlayer);
  /** Who plays each seat's turns, indexed by `Seat`. */
  private readonly seats: readonly [SeatController, SeatController] = [
    inject(PlayerTurn),
    this.computer,
  ];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Starts a new game on a `size` board: the computer places its fleet, the player places theirs. */
  newGame(size: BoardSize): void {
    this.stop();
    this.game.newGame(size);
    this.computer.placeFleet();
    this.placement.start(() => this.beginBattle());
  }

  /** Stops every clock, e.g. when the player leaves the battle screen. */
  stop(): void {
    this.placement.stop();
    for (const seat of this.seats) seat.stop();
  }

  private beginBattle(): void {
    this.game.startBattle();
    this.nextTurn();
  }

  /** The single place that decides who acts next. */
  private nextTurn(): void {
    const turn = this.game.turn();
    if (this.game.phase() !== 'battle' || turn === null) {
      this.stop();
      return;
    }
    this.seats[turn].start(() => this.nextTurn());
  }
}
