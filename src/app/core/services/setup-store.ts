import { computed, Service, signal } from '@angular/core';
import type { BoardOptionId } from '@core/models/board-option';
import { SHIP_COLORS, type ShipColorDef, type ShipColorId } from '@core/models/ship-color';

/**
 * Holds the pre-game choices made across the setup steps, so later steps (and eventually
 * the game itself) can read what earlier steps chose. UI preferences only: no game rules.
 */
@Service()
export class SetupStore {
  private readonly boardOptionState = signal<BoardOptionId | null>(null);
  private readonly shipColorState = signal<ShipColorId | null>(null);

  readonly boardOption = this.boardOptionState.asReadonly();
  readonly shipColor = this.shipColorState.asReadonly();
  readonly shipColorDef = computed<ShipColorDef | null>(
    () => SHIP_COLORS.find((c) => c.id === this.shipColorState()) ?? null,
  );

  chooseBoard(id: BoardOptionId): void {
    this.boardOptionState.set(id);
  }

  chooseShipColor(id: ShipColorId): void {
    this.shipColorState.set(id);
  }
}
