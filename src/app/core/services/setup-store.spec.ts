import { TestBed } from '@angular/core/testing';
import { SetupStore } from './setup-store';

describe('SetupStore', () => {
  let store: SetupStore;

  beforeEach(() => {
    store = TestBed.inject(SetupStore);
  });

  it('starts with nothing chosen', () => {
    expect(store.boardOption()).toBeNull();
    expect(store.shipColor()).toBeNull();
    expect(store.shipColorDef()).toBeNull();
  });

  it('records the board choice', () => {
    store.chooseBoard('option-2');
    expect(store.boardOption()).toBe('option-2');
  });

  it('records the ship colour and resolves its definition', () => {
    store.chooseShipColor('green');
    expect(store.shipColor()).toBe('green');
    expect(store.shipColorDef()?.value).toBe('var(--ship-green)');

    store.chooseShipColor('purple');
    expect(store.shipColorDef()?.label).toBe('Purple');
  });
});
