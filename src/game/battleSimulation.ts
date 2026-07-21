import type { BotDifficulty, GameState, HqNation, PlayerId } from '../types';
import { chooseBotActionForDifficulty } from './bots/botController';
import { applyGameAction } from './gameActions';
import { beginBattle, createInitialGame, startGame } from './gameLogic';

export type BattleSimulationConfig = {
  battles: number;
  maxActionsPerBattle: number;
  player1Difficulty: BotDifficulty;
  player2Difficulty: BotDifficulty;
  player1Nation: HqNation;
  player2Nation: HqNation;
  seed: number;
};

export type BattleSimulationResult = {
  battleNumber: number;
  winner: PlayerId | null;
  turns: number;
  actions: number;
  timedOut: boolean;
};

export type BattleSimulationSummary = {
  config: BattleSimulationConfig;
  player1Wins: number;
  player2Wins: number;
  draws: number;
  averageTurns: number;
  averageActions: number;
  results: BattleSimulationResult[];
};

const defaultConfig: BattleSimulationConfig = {
  battles: 100,
  maxActionsPerBattle: 500,
  player1Difficulty: 'normal',
  player2Difficulty: 'normal',
  player1Nation: 'germany',
  player2Nation: 'soviet',
  seed: 1942,
};

// Determinisztikus pseudo-random generator, hogy ugyanaz a seed ugyanazt a tesztcsata-sort adja.
function createSeededRandom(seed: number): () => number {
  let value = seed % 2147483647;

  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

// A paklikeveres jelenleg Math.randomot hasznal, ezert a szimulacio inditasakor roviden seedelt randomra valtunk.
function createSeededBattleState(config: BattleSimulationConfig, random: () => number): GameState {
  const originalRandom = Math.random;
  Math.random = random;

  try {
    const initial = createInitialGame();
    const selectedMode = startGame(initial, 'pve');
    return beginBattle(
      selectedMode,
      { 1: config.player1Nation, 2: config.player2Nation },
      config.player2Difficulty,
    );
  } finally {
    Math.random = originalRandom;
  }
}

// Egy teljes bot-vs-bot csatat lejatszik kattintasok nelkul, a kozos GameAction modellen keresztul.
export function simulateBattle(
  configOverrides: Partial<BattleSimulationConfig> = {},
  battleNumber = 1,
): BattleSimulationResult {
  const config = { ...defaultConfig, ...configOverrides };
  const random = createSeededRandom(config.seed + battleNumber * 9973);
  let state = createSeededBattleState(config, random);
  let actions = 0;

  while (state.phase === 'playing' && actions < config.maxActionsPerBattle) {
    const activeDifficulty = state.activePlayer === 1 ? config.player1Difficulty : config.player2Difficulty;
    const action = chooseBotActionForDifficulty(state, activeDifficulty, random) ?? { type: 'end_turn' as const };
    const nextState = applyGameAction(state, action);

    // Ha egy hibas akcio veletlenul nem mozdítana az allapoton, zarjuk a kort, hogy ne ragadjon be a szimulacio.
    state = nextState === state && action.type !== 'end_turn'
      ? applyGameAction(state, { type: 'end_turn' })
      : nextState;
    actions += 1;
  }

  return {
    battleNumber,
    winner: state.winner,
    turns: state.turn,
    actions,
    timedOut: state.phase === 'playing',
  };
}

// Sok automatikus csatat futtat es aggregate statisztikat ad vissza az AI balansz gyors meresehez.
export function runBattleSimulations(configOverrides: Partial<BattleSimulationConfig> = {}): BattleSimulationSummary {
  const config = { ...defaultConfig, ...configOverrides };
  const results = Array.from({ length: config.battles }, (_, index) => simulateBattle(config, index + 1));
  const player1Wins = results.filter((result) => result.winner === 1).length;
  const player2Wins = results.filter((result) => result.winner === 2).length;
  const draws = results.length - player1Wins - player2Wins;
  const totalTurns = results.reduce((total, result) => total + result.turns, 0);
  const totalActions = results.reduce((total, result) => total + result.actions, 0);

  return {
    config,
    player1Wins,
    player2Wins,
    draws,
    averageTurns: results.length > 0 ? totalTurns / results.length : 0,
    averageActions: results.length > 0 ? totalActions / results.length : 0,
    results,
  };
}
