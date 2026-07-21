import type { GameAction, GameState } from '../../types';
import { getLegalActions } from '../gameActions';

// Veletlenszeruen valaszt az aktiv jatekos legalis akcioi kozul.
// A random parameterrel kesobb determinisztikus tesztgenerator is beadhato.
export function chooseRandomBotAction(
  state: GameState,
  random: () => number = Math.random,
): GameAction | null {
  const legalActions = getLegalActions(state);

  if (legalActions.length === 0) {
    return null;
  }

  const randomIndex = Math.min(
    legalActions.length - 1,
    Math.floor(Math.max(0, random()) * legalActions.length),
  );

  return legalActions[randomIndex];
}
