import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BOARD_OPTIONS, type BoardOptionId } from '@core/models/board-option';
import { SetupStore } from '@core/services/setup-store/setup-store';
import { Tile } from '@shared/ui/tile/tile';

/** Setup step 1: pick a board. Choosing records it and moves on to the ship colour step. */
@Component({
  selector: 'app-board-size-page',
  imports: [Tile],
  styleUrl: './board-size-page.scss',
  templateUrl: './board-size-page.html',
})
export class BoardSizePage {
  private readonly store = inject(SetupStore);
  private readonly router = inject(Router);

  protected readonly options = BOARD_OPTIONS;

  protected async choose(id: BoardOptionId): Promise<void> {
    this.store.chooseBoard(id);
    await this.router.navigate(['/setup/color']);
  }
}
