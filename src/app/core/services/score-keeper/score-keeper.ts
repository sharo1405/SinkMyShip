import { computed, inject, Service } from '@angular/core';
import { COMPUTER, PLAYER } from '@core/models/seats';
import { GameStore } from '@core/services/game-store/game-store';
import { scoreLog, type SeatScore } from '@sinkmyship/game';

/**
 * Each side's score for the current game. The scoring rules are `scoreLog` in the rules
 * package; this only replays the game log through them, so there is no score state to keep
 * in sync, and a new game (empty log) starts both sides at 0.
 */
@Service()
export class ScoreKeeper {
  private readonly game = inject(GameStore);
  private readonly scores = computed(() => scoreLog(this.game.log()));

  readonly player = computed<SeatScore>(() => this.scores()[PLAYER]);
  readonly computer = computed<SeatScore>(() => this.scores()[COMPUTER]);
}
