import type { BotDifficulty, GameAction, GameState } from '../../types';
import { chooseHardHeuristicBotAction, chooseHeuristicBotAction } from './heuristicBot';
import { chooseRandomBotAction } from './randomBot';

// A difficulty routing egy helyen van, hogy az App ne ismerje a konkret bot implementaciokat.
export function chooseBotActionForDifficulty(
  state: GameState,
  difficulty: BotDifficulty,
  random: () => number = Math.random,
): GameAction | null {
  switch (difficulty) {
    case 'easy':
      return chooseRandomBotAction(state, random);
    case 'normal':
      return chooseHeuristicBotAction(state, random);
    case 'hard':
      return chooseHardHeuristicBotAction(state, random);
    default: {
      const exhaustiveCheck: never = difficulty;
      return exhaustiveCheck;
    }
  }
}
