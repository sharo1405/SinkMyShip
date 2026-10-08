import { TestBed } from '@angular/core/testing';
import { PlayerPowers } from './player-powers';

describe('PlayerPowers', () => {
  it('keeps at most one power active', () => {
    const powers = TestBed.inject(PlayerPowers);
    expect(powers.active()).toBeNull();

    powers.select('radar');
    expect(powers.active()).toBe('radar');
    powers.select('random-shots');
    expect(powers.active()).toBe('random-shots');

    powers.clear();
    expect(powers.active()).toBeNull();
  });
});
