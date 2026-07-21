import type { GameAction, GameState } from '../types';
import {
  attack,
  endTurn,
  getAttackableSlots,
  getCommandTargetableSlots,
  getDeployableSlots,
  getMovableSlots,
  getSupportDeployableSlots,
  moveUnit,
  playCard,
  selectHq,
  selectUnit,
} from './gameLogic';

// A forrasmezo alapjan kivalasztja a tamado unitot vagy HQ-t.
// Ez az adapter rejti el a UI kijelolesi allapotat az atomikus GameAction elol.
function selectActionSource(state: GameState, sourceSlotIndex: number): GameState {
  const stateWithoutUiSelection = state.selectedUnit ? { ...state, selectedUnit: null } : state;
  const source = stateWithoutUiSelection.board[sourceSlotIndex];

  if (source?.slotType === 'unit') {
    return selectUnit(stateWithoutUiSelection, source.owner, sourceSlotIndex);
  }

  if (source?.slotType === 'hq') {
    return selectHq(stateWithoutUiSelection, source.owner, sourceSlotIndex);
  }

  return stateWithoutUiSelection;
}

// Az aktiv jatekos kezebol eloallitja az osszes megfizetheto es szabalyosan celozhato kartyakijatszast.
function getLegalCardActions(state: GameState): GameAction[] {
  const player = state.players[state.activePlayer];
  const actions: GameAction[] = [];

  player.hand.forEach((card) => {
    if (card.cost > player.commandPoints) {
      return;
    }

    if (card.type === 'unit') {
      getDeployableSlots(state.board, player.id).forEach((targetSlotIndex) => {
        actions.push({ type: 'play_card', cardInstanceId: card.instanceId, targetSlotIndex });
      });
      return;
    }

    if (card.type === 'support') {
      getSupportDeployableSlots(state, player.id, card).forEach((targetSlotIndex) => {
        actions.push({ type: 'play_card', cardInstanceId: card.instanceId, targetSlotIndex });
      });
      return;
    }

    const requiresBoardTarget = card.target === 'enemy_unit' || card.target === 'enemy_unit_or_hq';

    if (requiresBoardTarget) {
      getCommandTargetableSlots(state, card).forEach((targetSlotIndex) => {
        actions.push({ type: 'play_card', cardInstanceId: card.instanceId, targetSlotIndex });
      });
      return;
    }

    actions.push({ type: 'play_card', cardInstanceId: card.instanceId });
  });

  return actions;
}

// Minden sajat unit es HQ forrasmezobol eloallitja a legalis mozgasokat es tamadasokat.
function getLegalBoardActions(state: GameState): GameAction[] {
  const actions: GameAction[] = [];

  state.board.forEach((source, sourceSlotIndex) => {
    if (!source || source.owner !== state.activePlayer) {
      return;
    }

    const selectedState = selectActionSource(state, sourceSlotIndex);

    if (source.slotType === 'unit') {
      getMovableSlots(selectedState).forEach((targetSlotIndex) => {
        actions.push({ type: 'move_unit', sourceSlotIndex, targetSlotIndex });
      });
    }

    getAttackableSlots(selectedState).forEach((targetSlotIndex) => {
      actions.push({ type: 'attack', sourceSlotIndex, targetSlotIndex });
    });
  });

  return actions;
}

// Visszaadja az aktiv jatekos teljes legalis akcioteret anelkul, hogy modositana a GameState-et.
// A sorrend stabil: kartyak, board akciok, majd a mindig elerheto korzaras.
export function getLegalActions(state: GameState): GameAction[] {
  if (state.phase !== 'playing') {
    return [];
  }

  return [
    ...getLegalCardActions(state),
    ...getLegalBoardActions(state),
    { type: 'end_turn' },
  ];
}

// Egyetlen kozos belepesi ponton hajtja vegre az ember vagy az AI jatekakciojat.
// Minden meghivott szabalyfuggveny uj GameState-et ad vissza, az eredeti state-et nem modositja.
export function applyGameAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'play_card':
      return playCard(state, action.cardInstanceId, action.targetSlotIndex);

    case 'move_unit': {
      const selectedState = selectActionSource(state, action.sourceSlotIndex);
      return moveUnit(selectedState, action.targetSlotIndex);
    }

    case 'attack': {
      const selectedState = selectActionSource(state, action.sourceSlotIndex);
      return attack(selectedState, action.targetSlotIndex);
    }

    case 'end_turn':
      return endTurn(state);

    default: {
      const exhaustiveCheck: never = action;
      return exhaustiveCheck;
    }
  }
}
