import { TestBed } from '@angular/core/testing';
import { RNG } from '@core/models/rng';
import { COMPUTER, PLAYER } from '@core/models/seats';
import {
  isFleetComplete,
  PLACEMENT_TIME_LIMIT_MS,
  seededRng,
  TURN_TIME_LIMIT_MS,
} from '@sinkmyship/game';
import { GameStore } from '@core/services/game-store/game-store';
import { MatchController } from './match-controller';
import { PlayerPlacement } from '@core/services/player-placement/player-placement';
import { PlayerTurn } from '@core/services/player-turn/player-turn';

describe('MatchController', () => {
  let game: GameStore;
  let match: MatchController;
  let placement: PlayerPlacement;
  let turn: PlayerTurn;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'],
    });
    TestBed.configureTestingModule({ providers: [{ provide: RNG, useValue: seededRng(1) }] });
    game = TestBed.inject(GameStore);
    match = TestBed.inject(MatchController);
    placement = TestBed.inject(PlayerPlacement);
    turn = TestBed.inject(PlayerTurn);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Ends placement the quick way: let the clock place the player's fleet. */
  const skipPlacement = () => vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS);

  it('starts a game with the computer fleet placed and the placement clock running', () => {
    match.newGame(6);

    expect(game.phase()).toBe('placing');
    const computer = game.computerBoard();
    expect(computer && isFleetComplete(computer)).toBe(true);
    expect(game.playerBoard()?.ships).toEqual([]);
    expect(placement.timeLeftMs()).toBe(PLACEMENT_TIME_LIMIT_MS);
  });

  it('starts the battle with the player turn when placement ends', () => {
    match.newGame(4);
    skipPlacement();

    expect(game.phase()).toBe('battle');
    expect(turn.active()).toBe(true);
    expect(turn.timeLeftMs()).toBe(TURN_TIME_LIMIT_MS);
  });

  it('alternates: the player turn, then the computer three seconds later', () => {
    match.newGame(4);
    skipPlacement();

    vi.advanceTimersByTime(TURN_TIME_LIMIT_MS);
    expect(game.turn()).toBe(COMPUTER);
    expect(turn.timeLeftMs()).toBeNull();

    vi.advanceTimersByTime(3_000);
    expect(game.playerBoard()?.shots.length).toBe(1);
    expect(game.turn()).toBe(PLAYER);
    expect(turn.timeLeftMs()).toBe(TURN_TIME_LIMIT_MS);
  });

  it('stops every clock when the game is over', () => {
    match.newGame(4);
    skipPlacement();

    for (const target of game.computerBoard()?.ships.flatMap((s) => s.cells) ?? []) {
      if (game.phase() !== 'battle') break;
      turn.fireAt(target);
      vi.advanceTimersByTime(3_000);
    }

    expect(game.phase()).toBe('over');
    expect(game.winner()).toBe(PLAYER);
    expect(turn.timeLeftMs()).toBeNull();
    const turns = game.log().length;
    vi.advanceTimersByTime(120_000);
    expect(game.log().length).toBe(turns);
  });

  it('restarts cleanly with a new game and stays quiet once stopped', () => {
    match.newGame(4);
    skipPlacement();
    match.newGame(4);
    expect(game.phase()).toBe('placing');
    expect(game.log()).toEqual([]);

    match.stop();
    vi.advanceTimersByTime(PLACEMENT_TIME_LIMIT_MS * 2);
    expect(game.phase()).toBe('placing');
  });
});
