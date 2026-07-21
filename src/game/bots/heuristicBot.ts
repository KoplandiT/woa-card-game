import type { BoardSlot, CardInstance, GameAction, GameState, PlayerId, UnitInstance } from '../../types';
import { getLegalActions } from '../gameActions';
import { gameConstants } from '../gameLogic';

const WIN_SCORE = 10_000;

const enemyOf = (player: PlayerId): PlayerId => (player === 1 ? 2 : 1);

type HeuristicProfile = {
  aggression: number;
  economy: number;
  support: number;
  movement: number;
  risk: number;
};

const normalProfile: HeuristicProfile = {
  aggression: 1,
  economy: 1,
  support: 1,
  movement: 1,
  risk: 1,
};

const hardProfile: HeuristicProfile = {
  aggression: 1.25,
  economy: 1.18,
  support: 1.12,
  movement: 1.15,
  risk: 1.35,
};

function isUnit(slot: BoardSlot): slot is UnitInstance {
  return slot?.slotType === 'unit';
}

function canCounterattack(unit: UnitInstance): boolean {
  if (unit.unitType === 'artillery' || unit.unitType === 'heavy_tank') {
    return false;
  }

  return !unit.hasAttacked || unit.canCounterattackNextTurn;
}

// A nagy tamadoero, tuleloero es resource-termeles egyutt adja egy unit taktikai erteket.
function getUnitValue(unit: UnitInstance): number {
  return (unit.attack ?? 0) * 10 + unit.currentHp * 6 + (unit.resource ?? 0) * 22;
}

function getCardByInstanceId(state: GameState, instanceId: string): CardInstance | undefined {
  return state.players[state.activePlayer].hand.find((card) => card.instanceId === instanceId);
}

function getDistance(firstSlot: number, secondSlot: number): number {
  const firstRow = Math.floor(firstSlot / gameConstants.boardColumns);
  const firstColumn = firstSlot % gameConstants.boardColumns;
  const secondRow = Math.floor(secondSlot / gameConstants.boardColumns);
  const secondColumn = secondSlot % gameConstants.boardColumns;
  return Math.abs(firstRow - secondRow) + Math.abs(firstColumn - secondColumn);
}

function isNeighbor(firstSlot: number, secondSlot: number): boolean {
  const firstRow = Math.floor(firstSlot / gameConstants.boardColumns);
  const firstColumn = firstSlot % gameConstants.boardColumns;
  const secondRow = Math.floor(secondSlot / gameConstants.boardColumns);
  const secondColumn = secondSlot % gameConstants.boardColumns;
  return Math.max(Math.abs(firstRow - secondRow), Math.abs(firstColumn - secondColumn)) === 1;
}

// Megszamolja, hany ellenseges unitot deritenek fel a jatekos aktualis egysegei.
function countSpottedEnemies(board: BoardSlot[], player: PlayerId): number {
  const enemy = enemyOf(player);

  return board.reduce((total, target, targetSlot) => {
    if (!isUnit(target) || target.owner !== enemy) {
      return total;
    }

    const isSpotted = board.some((spotter, spotterSlot) => (
      isUnit(spotter) && spotter.owner === player && isNeighbor(spotterSlot, targetSlot)
    ));
    return total + (isSpotted ? 1 : 0);
  }, 0);
}

function getHqAttack(state: GameState, owner: PlayerId, baseAttack: number): number {
  const supportBonus = state.supportSlots[owner].reduce(
    (total, support) => total + (support?.attackBonus ?? 0),
    0,
  );
  return baseAttack + supportBonus;
}

// Sebzesnel kiemelten jutalmazza a lethal HQ-talalatot es az ertekes unit megsemmisiteset.
function scoreDamage(state: GameState, targetSlotIndex: number, damage: number, profile: HeuristicProfile): number {
  const target = state.board[targetSlotIndex];

  if (target?.slotType === 'hq') {
    const supportProtection = state.supportSlots[target.owner].reduce(
      (total, support) => total + (support?.currentHp ?? 0),
      0,
    );
    const targetHp = state.players[target.owner].baseHp + supportProtection;
    return damage >= targetHp ? WIN_SCORE : damage * 28 * profile.aggression;
  }

  if (isUnit(target)) {
    return damage >= target.currentHp
      ? 140 + getUnitValue(target) * profile.aggression
      : Math.min(damage, target.currentHp) * 13 * profile.aggression;
  }

  return -100;
}

function scoreCardAction(state: GameState, action: Extract<GameAction, { type: 'play_card' }>, profile: HeuristicProfile): number {
  const card = getCardByInstanceId(state, action.cardInstanceId);

  if (!card) {
    return -100;
  }

  if (card.type === 'unit') {
    const targetSlot = action.targetSlotIndex ?? 0;
    const enemyHqSlot = state.activePlayer === 1 ? gameConstants.player2HqSlot : gameConstants.player1HqSlot;
    const proximity = gameConstants.boardRows + gameConstants.boardColumns - getDistance(targetSlot, enemyHqSlot);
    return (card.attack ?? 0) * 9 * profile.aggression
      + (card.hp ?? 0) * 5
      + (card.resource ?? 0) * 24 * profile.economy
      + proximity * 3 * profile.movement
      - card.cost;
  }

  if (card.type === 'support') {
    return (card.attackBonus ?? 0) * 34 * profile.aggression
      + (card.resource ?? 0) * 26 * profile.economy
      + (card.hp ?? 0) * 5 * profile.support
      - card.cost;
  }

  if (card.damage && card.damage < 0) {
    const player = state.players[state.activePlayer];
    const effectiveHealing = Math.min(Math.abs(card.damage), player.maxBaseHp - player.baseHp);
    return effectiveHealing > 0 ? effectiveHealing * 20 : -20;
  }

  if (card.commandEffect === 'opponent_discard_random') {
    const enemy = enemyOf(state.activePlayer);
    const enemyHandSize = state.players[enemy].hand.length;
    return enemyHandSize > 0 ? 42 + enemyHandSize * 4 - card.cost : -card.cost;
  }

  if (card.damage && card.damage > 0 && card.target === 'enemy_hq') {
    const enemyHqSlot = state.activePlayer === 1 ? gameConstants.player2HqSlot : gameConstants.player1HqSlot;
    return scoreDamage(state, enemyHqSlot, card.damage, profile) - card.cost;
  }

  if (typeof action.targetSlotIndex === 'number') {
    return scoreDamage(state, action.targetSlotIndex, Math.max(0, card.damage ?? 0), profile) - card.cost;
  }

  return -card.cost;
}

function scoreMoveAction(state: GameState, action: Extract<GameAction, { type: 'move_unit' }>, profile: HeuristicProfile): number {
  const enemyHqSlot = state.activePlayer === 1 ? gameConstants.player2HqSlot : gameConstants.player1HqSlot;
  const distanceGain = getDistance(action.sourceSlotIndex, enemyHqSlot) - getDistance(action.targetSlotIndex, enemyHqSlot);
  const simulatedBoard = [...state.board];
  simulatedBoard[action.targetSlotIndex] = simulatedBoard[action.sourceSlotIndex];
  simulatedBoard[action.sourceSlotIndex] = null;
  const newSpots = countSpottedEnemies(simulatedBoard, state.activePlayer) - countSpottedEnemies(state.board, state.activePlayer);
  return distanceGain * 12 * profile.movement + newSpots * 24 * profile.movement;
}

function scoreAttackAction(state: GameState, action: Extract<GameAction, { type: 'attack' }>, profile: HeuristicProfile): number {
  const attacker = state.board[action.sourceSlotIndex];
  const target = state.board[action.targetSlotIndex];

  if (!attacker || !target) {
    return -100;
  }

  const damage = attacker.slotType === 'hq'
    ? getHqAttack(state, attacker.owner, attacker.attack)
    : attacker.attack ?? 0;
  let score = scoreDamage(state, action.targetSlotIndex, damage, profile);
  const targetCanCounter = isUnit(target) && canCounterattack(target);

  // A tank destroyer counterattackja a loves elott tortenik, ezert lethal esetben a tamado nem sebez.
  if (
    isUnit(attacker)
    && isUnit(target)
    && target.unitType === 'tank_destroyer'
    && targetCanCounter
    && isNeighbor(action.sourceSlotIndex, action.targetSlotIndex)
    && (target.attack ?? 0) >= attacker.currentHp
  ) {
    return -getUnitValue(attacker) * profile.risk;
  }

  // Nem lethal kozelharcnal szamol a varhato counterattack kockazataval is.
  if (
    isUnit(attacker)
    && isUnit(target)
    && targetCanCounter
    && damage < target.currentHp
    && isNeighbor(action.sourceSlotIndex, action.targetSlotIndex)
  ) {
    score -= (target.attack ?? 0) * 8 * profile.risk;
    if ((target.attack ?? 0) >= attacker.currentHp) {
      score -= getUnitValue(attacker) * profile.risk;
    }
  }

  return score;
}

// Az akciopontszam kulon exportalt, igy kesobb tesztben es debug panelen is vizsgalhato.
export function scoreHeuristicAction(state: GameState, action: GameAction): number {
  return scoreProfiledHeuristicAction(state, action, normalProfile);
}

// Ugyanazt a szabalyalapu pontozot hasznalja, de a profil sulyai mas bot-szemelyiseget adnak.
function scoreProfiledHeuristicAction(state: GameState, action: GameAction, profile: HeuristicProfile): number {
  switch (action.type) {
    case 'play_card':
      return scoreCardAction(state, action, profile);
    case 'move_unit':
      return scoreMoveAction(state, action, profile);
    case 'attack':
      return scoreAttackAction(state, action, profile);
    case 'end_turn':
      return 0;
    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}

// A legmagasabb pontszamu legalis akciot valasztja; holtversenynel veletlenszeruen dont.
function chooseProfiledHeuristicBotAction(
  state: GameState,
  random: () => number = Math.random,
  profile: HeuristicProfile = normalProfile,
): GameAction | null {
  const legalActions = getLegalActions(state);

  if (legalActions.length === 0) {
    return null;
  }

  const scoredActions = legalActions.map((action) => ({ action, score: scoreProfiledHeuristicAction(state, action, profile) }));
  const bestScore = Math.max(...scoredActions.map(({ score }) => score));
  const bestActions = scoredActions.filter(({ score }) => score === bestScore);
  const randomIndex = Math.min(bestActions.length - 1, Math.floor(Math.max(0, random()) * bestActions.length));
  return bestActions[randomIndex].action;
}

// Normal nehezseg: stabil, egy lepeses, szabalyalapu dontes.
export function chooseHeuristicBotAction(
  state: GameState,
  random: () => number = Math.random,
): GameAction | null {
  return chooseProfiledHeuristicBotAction(state, random, normalProfile);
}

// A hard bot ugyanazon akcioteret nezi, de agresszivebben ertekeli a lethal sebzest,
// a resource-termelest es a spot/pozicionalo lepeseiket, mikozben jobban bunteti a rossz tradet.
export function chooseHardHeuristicBotAction(
  state: GameState,
  random: () => number = Math.random,
): GameAction | null {
  return chooseProfiledHeuristicBotAction(state, random, hardProfile);
}
