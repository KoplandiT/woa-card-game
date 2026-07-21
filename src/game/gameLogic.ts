import { cards, starterDeckCardIds } from '../data/cards';
import { hqDefinitions } from '../data/hqs';
import type {
  BoardSlot,
  BotDifficulty,
  CardInstance,
  GameState,
  GameMode,
  HqNation,
  PlayerId,
  PlayerBattleStats,
  PlayerState,
  SupportInstance,
  SupportSlot,
  SupportType,
  UnitInstance,
  UnitType,
} from '../types';

const BOARD_ROWS = 3;
const BOARD_COLUMNS = 5;
const BOARD_SLOTS = BOARD_ROWS * BOARD_COLUMNS;
const SUPPORT_SLOTS = 5;
const ACTIVE_SUPPORT_SLOTS = 3;
const SUPPORT_SLOT_TYPES: Array<SupportType | null> = ['scout', 'medic', 'engineer', null, null];
const PLAYER_1_HQ_SLOT = 10;
const PLAYER_2_HQ_SLOT = 4;
const HQ_SLOTS: Record<PlayerId, number> = {
  1: PLAYER_1_HQ_SLOT,
  2: PLAYER_2_HQ_SLOT,
};
const DEFAULT_HQ_NATIONS: Record<PlayerId, HqNation> = {
  1: 'germany',
  2: 'soviet',
};
const STARTING_HAND_SIZE = 4;
const MAX_COMMAND_POINTS = 25;

const createEmptyBattleStats = (): PlayerBattleStats => ({
  damageDealt: 0,
  enemyUnitsDestroyed: 0,
  unitsDeployed: 0,
  supportsDeployed: 0,
  commandCardsPlayed: 0,
  resourcesSpent: 0,
});

const cardById = new Map(cards.map((card) => [card.id, card]));

// Visszaadja az ellenfel jatekosazonositojat.
const enemyOf = (player: PlayerId): PlayerId => (player === 1 ? 2 : 1);

// Egyszeru, novekvo egyedi azonosito gyarto lapokhoz es naplobejegyzesekhez.
const makeInstanceId = (() => {
  let counter = 0;
  return (prefix: string) => `${prefix}-${counter++}`;
})();

// Fisher-Yates algoritmussal uj, veletlen sorrendu tombbe keveri a paklit.
function shuffleDeck<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

// A mock paklilista id-jaibol egyedi peldanyokat keszit, majd minden uj jateknal megkeveri oket.
function buildDeck(player: PlayerId): CardInstance[] {
  const deck = starterDeckCardIds.map((id, index) => {
      const card = cardById.get(id);

      if (!card) {
        throw new Error(`Unknown card id: ${id}`);
      }

      return {
        ...card,
        instanceId: `p${player}-${index}-${makeInstanceId(id)}`,
      };
    });

  return shuffleDeck(deck);
}

// Letrehozza a 3x5-os palyat a ket jatekos altal valasztott HQ definiciokkal.
function createInitialBoard(nations: Record<PlayerId, HqNation> = DEFAULT_HQ_NATIONS): BoardSlot[] {
  const board = Array.from<BoardSlot>({ length: BOARD_SLOTS }).fill(null);
  const player1Hq = hqDefinitions[nations[1]];
  const player2Hq = hqDefinitions[nations[2]];
  board[PLAYER_1_HQ_SLOT] = { slotType: 'hq', owner: 1, ...player1Hq, hasAttacked: false };
  board[PLAYER_2_HQ_SLOT] = { slotType: 'hq', owner: 2, ...player2Hq, hasAttacked: false };
  return board;
}

// Letrehozza a ket jatekos kulon support savjat. Ezek nem a mozgas/tamadas board reszei.
function createInitialSupportSlots(): Record<PlayerId, SupportSlot[]> {
  return {
    1: Array.from<SupportSlot>({ length: SUPPORT_SLOTS }).fill(null),
    2: Array.from<SupportSlot>({ length: SUPPORT_SLOTS }).fill(null),
  };
}

// Megadja, hogy egy support slot milyen tipusu kartyat fogad. A null most deaktivalt slotot jelent.
export function getSupportSlotType(slotIndex: number): SupportType | null {
  return SUPPORT_SLOT_TYPES[slotIndex] ?? null;
}

// Igaz, ha a slot jelenleg aktiv support hely.
export function isActiveSupportSlot(slotIndex: number): boolean {
  return slotIndex >= 0 && slotIndex < ACTIVE_SUPPORT_SLOTS && getSupportSlotType(slotIndex) !== null;
}

// Igaz, ha a sloton egyseg all. Ezzel TypeScriptben is szukul a tipus.
function isUnit(slot: BoardSlot): slot is UnitInstance {
  return slot?.slotType === 'unit';
}

// Osszeadja az adott jatekos aktiv support lapjait egy szamma.
function sumSupportSlots(supportSlots: SupportSlot[], selector: (support: SupportInstance) => number | undefined): number {
  return supportSlots.reduce((total, support) => total + (support ? selector(support) ?? 0 : 0), 0);
}

// Megnezi, hogy ket mezo vizszintesen vagy fuggolegesen szomszedos-e egymassal.
function isOrthogonalNeighbor(firstSlot: number, secondSlot: number): boolean {
  const firstRow = Math.floor(firstSlot / BOARD_COLUMNS);
  const firstColumn = firstSlot % BOARD_COLUMNS;
  const secondRow = Math.floor(secondSlot / BOARD_COLUMNS);
  const secondColumn = secondSlot % BOARD_COLUMNS;
  const rowDistance = Math.abs(firstRow - secondRow);
  const columnDistance = Math.abs(firstColumn - secondColumn);

  return rowDistance + columnDistance === 1;
}

// Megnezi, hogy ket mezo akar atlosan is szomszedos-e egymassal.
function isAnyNeighbor(firstSlot: number, secondSlot: number): boolean {
  const firstRow = Math.floor(firstSlot / BOARD_COLUMNS);
  const firstColumn = firstSlot % BOARD_COLUMNS;
  const secondRow = Math.floor(secondSlot / BOARD_COLUMNS);
  const secondColumn = secondSlot % BOARD_COLUMNS;
  const rowDistance = Math.abs(firstRow - secondRow);
  const columnDistance = Math.abs(firstColumn - secondColumn);

  return Math.max(rowDistance, columnDistance) === 1;
}

// Megadja egy mezo osszes palyan beluli, nem atlos szomszedjat.
function getOrthogonalNeighbors(slotIndex: number): number[] {
  return Array.from({ length: BOARD_SLOTS }, (_, index) => index).filter((index) => (
    isOrthogonalNeighbor(slotIndex, index)
  ));
}

// Megadja egy mezo osszes palyan beluli szomszedjat, atlos mezokkel egyutt.
function getAllNeighbors(slotIndex: number): number[] {
  return Array.from({ length: BOARD_SLOTS }, (_, index) => index).filter((index) => (
    isAnyNeighbor(slotIndex, index)
  ));
}

// Az alap unit tipus. Ha egy regi/mock uniton hianyozna, mediumkent kezeljuk.
function getUnitType(unit: UnitInstance): UnitType {
  return unit.unitType ?? 'medium_tank';
}

// Tipusfuggoen megadja, hanyszor lephet a unit egy sajat korben.
function getMoveAllowance(unit: UnitInstance): number {
  return getUnitType(unit) === 'light_tank' ? 2 : 1;
}

// Light tank ortogonalisan ketszer, atlosan egyszer lephet; medium barmely iranyba egyszer.
function getMovementNeighbors(unit: UnitInstance, slotIndex: number): number[] {
  const unitType = getUnitType(unit);
  return unitType === 'light_tank' || unitType === 'medium_tank'
    ? getAllNeighbors(slotIndex)
    : getOrthogonalNeighbors(slotIndex);
}

// Az atlos light tank mozgas elhasznalja a teljes napi mozgasablakot, ortogonalisan viszont ket rovid lepes lehet.
function getMoveCost(unit: UnitInstance, sourceSlotIndex: number, targetSlotIndex: number): number {
  return getUnitType(unit) === 'light_tank' && !isOrthogonalNeighbor(sourceSlotIndex, targetSlotIndex) ? 2 : 1;
}

// Megmondja, hogy tamadas utan mely tipusok tarthatnak counterattack ablakot az ellenfel kovetkezo koreben.
function grantsCounterattackWindow(unit: UnitInstance): boolean {
  const unitType = getUnitType(unit);
  return unitType === 'light_tank' || unitType === 'medium_tank' || unitType === 'tank_destroyer';
}

// Egyseg akkor spotted, ha barmelyik szomszedos mezojen, akar atlosan is, van ellenseges egyseg.
function isSpottedBy(board: BoardSlot[], targetSlotIndex: number, spottingPlayer: PlayerId): boolean {
  return getAllNeighbors(targetSlotIndex).some((slotIndex) => {
    const neighbor = board[slotIndex];
    return isUnit(neighbor) && neighbor.owner === spottingPlayer;
  });
}

// Artillery kozelharcban leblokkol: ha mellette ellenseges unit van, nem lephet es nem tamadhat.
function isArtillerySuppressed(board: BoardSlot[], unit: UnitInstance, slotIndex: number): boolean {
  if (getUnitType(unit) !== 'artillery') {
    return false;
  }

  return getOrthogonalNeighbors(slotIndex).some((neighborIndex) => {
    const neighbor = board[neighborIndex];
    return isUnit(neighbor) && neighbor.owner !== unit.owner;
  });
}

// Megmondja, hogy egy tulelo vedekezo unit tud-e counterattackolni.
function canCounterattack(unit: UnitInstance): boolean {
  const unitType = getUnitType(unit);

  if (unitType === 'artillery' || unitType === 'heavy_tank') {
    return false;
  }

  return !unit.hasAttacked || unit.canCounterattackNextTurn;
}

// Osszeadja az adott jatekos palyan levo, elo unitjainak resource bonuszat.
function getBoardResourceIncome(board: BoardSlot[], player: PlayerId): number {
  return board.reduce((total, slot) => (
    isUnit(slot) && slot.owner === player ? total + (slot.resource ?? 0) : total
  ), 0);
}

// Support lapokbol szarmazo HQ resource bonusz.
function getSupportResourceIncome(supportSlots: Record<PlayerId, SupportSlot[]>, player: PlayerId): number {
  return sumSupportSlots(supportSlots[player], (support) => support.resource);
}

// Egy akcio utan azonnal levonja azokat a CP-ket, amelyeket egy megsemmisult unit
// vagy support mar nem termel. Az ujonnan lerakott lapok bonusza csak a kovetkezo korben jar.
function applyImmediateResourceLoss(previousState: GameState, nextState: GameState): GameState {
  let players = nextState.players;

  ([1, 2] as PlayerId[]).forEach((player) => {
    const previousIncome = getBoardResourceIncome(previousState.board, player)
      + getSupportResourceIncome(previousState.supportSlots, player);
    const nextIncome = getBoardResourceIncome(nextState.board, player)
      + getSupportResourceIncome(nextState.supportSlots, player);
    const lostIncome = Math.max(0, previousIncome - nextIncome);

    if (lostIncome > 0) {
      players = {
        ...players,
        [player]: {
          ...players[player],
          commandPoints: Math.max(0, players[player].commandPoints - lostIncome),
        },
      };
    }
  });

  return players === nextState.players ? nextState : { ...nextState, players };
}

// Support lapokbol szarmazo HQ attack bonusz.
function getSupportAttackBonus(supportSlots: Record<PlayerId, SupportSlot[]>, player: PlayerId): number {
  return sumSupportSlots(supportSlots[player], (support) => support.attackBonus);
}

// HQ loves utan levonja az erre megjelolt supportok hasznalati HP-koltseget.
function consumeHqAttackSupportHp(supportSlots: Record<PlayerId, SupportSlot[]>, player: PlayerId): Record<PlayerId, SupportSlot[]> {
  return {
    ...supportSlots,
    [player]: supportSlots[player].map((support) => {
      const usageHpCost = support?.usageHpCost ?? 0;

      if (!support || usageHpCost <= 0) {
        return support;
      }

      const currentHp = support.currentHp - usageHpCost;
      return currentHp > 0 ? { ...support, currentHp } : null;
    }),
  };
}

// A kor alap resource erteke. Erre jon ra a palyan levo unitok resource bonusza.
function getHqResource(board: BoardSlot[], player: PlayerId): number {
  const hq = board[HQ_SLOTS[player]];
  return hq?.slotType === 'hq' ? hq.resource : 0;
}

// Visszaadja a boardon levo HQ alap sebzeset.
function getHqAttack(hq: Extract<BoardSlot, { slotType: 'hq' }>): number {
  return hq.attack;
}

function getProtectedHqHp(state: GameState, player: PlayerId): number {
  return state.players[player].baseHp + state.supportSlots[player].reduce(
    (total, support) => total + (support?.currentHp ?? 0),
    0,
  );
}

// Egy jatekos meccsstatisztikajat noveljuk immutabilisan, hogy a scoreboard pontos adatokbol dolgozzon.
function addBattleStats(
  state: GameState,
  player: PlayerId,
  stats: Partial<PlayerBattleStats>,
): GameState {
  const currentStats = state.battleStats[player];

  return {
    ...state,
    battleStats: {
      ...state.battleStats,
      [player]: {
        damageDealt: currentStats.damageDealt + (stats.damageDealt ?? 0),
        enemyUnitsDestroyed: currentStats.enemyUnitsDestroyed + (stats.enemyUnitsDestroyed ?? 0),
        unitsDeployed: currentStats.unitsDeployed + (stats.unitsDeployed ?? 0),
        supportsDeployed: currentStats.supportsDeployed + (stats.supportsDeployed ?? 0),
        commandCardsPlayed: currentStats.commandCardsPlayed + (stats.commandCardsPlayed ?? 0),
        resourcesSpent: currentStats.resourcesSpent + (stats.resourcesSpent ?? 0),
      },
    },
  };
}

// HQ HP sebzesnel ved a NaN ellen, ha egy regi allapotbol hianyzo stat erkezne.
function damageBaseHp(baseHp: number, maxBaseHp: number, damage: number): number {
  const safeBaseHp = Number.isFinite(baseHp) ? baseHp : maxBaseHp;
  const safeDamage = Number.isFinite(damage) ? damage : 0;

  return Math.max(0, safeBaseHp - safeDamage);
}

// HQ-t ero sebzesnel eloszor a jatekos elso aktiv support lapja serul, a maradek megy a HQ HP-ra.
function applyDamageToHq(state: GameState, player: PlayerId, damage: number): GameState {
  let remainingDamage = Math.max(0, damage);
  const supportSlots = {
    ...state.supportSlots,
    [player]: [...state.supportSlots[player]],
  };

  for (let index = 0; index < supportSlots[player].length && remainingDamage > 0; index += 1) {
    const support = supportSlots[player][index];

    if (!support) {
      continue;
    }

    const nextSupportHp = support.currentHp - remainingDamage;

    if (nextSupportHp > 0) {
      supportSlots[player][index] = { ...support, currentHp: nextSupportHp };
      remainingDamage = 0;
    } else {
      supportSlots[player][index] = null;
      remainingDamage = Math.abs(nextSupportHp);
    }
  }

  return {
    ...state,
    supportSlots,
    players: {
      ...state.players,
      [player]: {
        ...state.players[player],
        baseHp: damageBaseHp(state.players[player].baseHp, state.players[player].maxBaseHp, remainingDamage),
      },
    },
  };
}

// Kiszamolja, mennyi resource-szal kezdjen a jatekos a sajat koreben.
function getCommandPointsForTurn(state: GameState, player: PlayerId): number {
  return Math.min(
    MAX_COMMAND_POINTS,
    getHqResource(state.board, player) + getBoardResourceIncome(state.board, player) + getSupportResourceIncome(state.supportSlots, player),
  );
}

// Visszaadja azokat az ures mezoket, amelyek a HQ mellett vannak, az atlosakat is beleertve.
export function getDeployableSlots(board: BoardSlot[], player: PlayerId): number[] {
  const hqSlot = HQ_SLOTS[player];

  return board
    .map((slot, slotIndex) => ({ slot, slotIndex }))
    .filter(({ slot, slotIndex }) => !slot && isAnyNeighbor(hqSlot, slotIndex))
    .map(({ slotIndex }) => slotIndex);
}

// Igaz, ha az adott jatekosnak van legalabb egy szabad HQ melletti deploy mezoje.
export function canDeployUnit(board: BoardSlot[], player: PlayerId): boolean {
  return getDeployableSlots(board, player).length > 0;
}

// Visszaadja az adott jatekos ures support slotjait.
export function getSupportDeployableSlots(state: GameState, player: PlayerId, card?: CardInstance | null): number[] {
  const supportType = card?.type === 'support' ? card.supportType : null;

  if (card?.type === 'support' && !supportType) {
    return [];
  }

  return state.supportSlots[player]
    .map((slot, slotIndex) => ({ slot, slotIndex }))
    .filter(({ slot, slotIndex }) => !slot && isActiveSupportSlot(slotIndex) && (!supportType || getSupportSlotType(slotIndex) === supportType))
    .map(({ slotIndex }) => slotIndex);
}

// Igaz, ha van legalabb egy szabad support hely.
export function canDeploySupport(state: GameState, player: PlayerId, card?: CardInstance | null): boolean {
  return getSupportDeployableSlots(state, player, card).length > 0;
}

// Visszaadja, hova lephet a kijelolt unit a sajat tipusfuggo mozgasszabalya szerint.
export function getMovableSlots(state: GameState): number[] {
  const selected = state.selectedUnit;

  if (!selected || selected.actorType !== 'unit' || state.phase !== 'playing') {
    return [];
  }

  const unit = state.board[selected.slotIndex];

  if (
    !isUnit(unit)
    || unit.owner !== state.activePlayer
    || unit.movesUsed >= getMoveAllowance(unit)
    || isArtillerySuppressed(state.board, unit, selected.slotIndex)
  ) {
    return [];
  }

  return getMovementNeighbors(unit, selected.slotIndex).filter((slotIndex) => (
    !state.board[slotIndex] && unit.movesUsed + getMoveCost(unit, selected.slotIndex, slotIndex) <= getMoveAllowance(unit)
  ));
}

// Visszaadja a kijelolt unit vagy HQ tamadhato celpontjait spot, tavolsag es unit tipus alapjan.
export function getAttackableSlots(state: GameState): number[] {
  const selected = state.selectedUnit;

  if (!selected || state.phase !== 'playing') {
    return [];
  }

  const enemy = enemyOf(state.activePlayer);

  if (selected.actorType === 'hq') {
    const hq = state.board[selected.slotIndex];

    if (hq?.slotType !== 'hq' || hq.owner !== state.activePlayer || hq.hasAttacked) {
      return [];
    }

    return state.board
      .map((target, slotIndex) => ({ target, slotIndex }))
      .filter(({ target, slotIndex }) => (
        (isUnit(target) && target.owner === enemy && isSpottedBy(state.board, slotIndex, state.activePlayer))
        // Az ellenseges HQ globalis celpont: a tamadasahoz nem szukseges spotter unit.
        || (target?.slotType === 'hq' && target.owner === enemy)
      ))
      .map(({ slotIndex }) => slotIndex);
  }

  const unit = state.board[selected.slotIndex];

  if (!isUnit(unit) || unit.owner !== state.activePlayer || unit.hasAttacked) {
    return [];
  }

  if (getUnitType(unit) === 'artillery') {
    if (isArtillerySuppressed(state.board, unit, selected.slotIndex)) {
      return [];
    }

    return state.board
      .map((target, slotIndex) => ({ target, slotIndex }))
      .filter(({ target, slotIndex }) => (
        !isAnyNeighbor(selected.slotIndex, slotIndex)
        && (
          (isUnit(target) && target.owner === enemy && isSpottedBy(state.board, slotIndex, state.activePlayer))
          || (target?.slotType === 'hq' && target.owner === enemy)
        )
      ))
      .map(({ slotIndex }) => slotIndex);
  }

  return getAllNeighbors(selected.slotIndex).filter((slotIndex) => {
    const target = state.board[slotIndex];
    return (
      (isUnit(target) && target.owner === enemy && isSpottedBy(state.board, slotIndex, state.activePlayer))
      || (target?.slotType === 'hq' && target.owner === enemy)
    );
  });
}

// Celzott command lapokhoz adja vissza a valaszthato board mezoket.
export function getCommandTargetableSlots(state: GameState, card?: CardInstance | null): number[] {
  const targetsEnemyBoardSlot = card?.target === 'enemy_unit' || card?.target === 'enemy_unit_or_hq';

  if (state.phase !== 'playing' || !card || card.type !== 'command' || !targetsEnemyBoardSlot) {
    return [];
  }

  const enemy = enemyOf(state.activePlayer);

  return state.board
    .map((target, slotIndex) => ({ target, slotIndex }))
    .filter(({ target }) => (
      (isUnit(target) && target.owner === enemy)
      || (card.target === 'enemy_unit_or_hq' && target?.slotType === 'hq' && target.owner === enemy)
    ))
    .map(({ slotIndex }) => slotIndex);
}

// Lapokat huz a pakli tetejerol. Ha nincs tobb lap, a jatekos HQ-ja 1 sebzest kap.
function drawCards(player: PlayerState, amount: number): PlayerState {
  const deck = [...player.deck];
  const hand = [...player.hand];
  const discard = [...player.discard];
  let baseHp = player.baseHp;

  for (let i = 0; i < amount; i += 1) {
    const drawn = deck.shift();

    if (drawn) {
      hand.push(drawn);
    } else {
      baseHp -= 1;
    }
  }

  return { ...player, baseHp, deck, hand, discard };
}

// Letrehoz egy kezdo jatekosallapotot: HQ, parancspont, pakli, ures kez, majd kezdo lapok huzasa.
function createPlayer(id: PlayerId, name: string): PlayerState {
  const hq = hqDefinitions[DEFAULT_HQ_NATIONS[id]];
  const player: PlayerState = {
    id,
    name,
    faction: hq.faction,
    baseHp: hq.hp,
    maxBaseHp: hq.hp,
    commandPoints: hq.resource,
    deck: buildDeck(id),
    hand: [],
    discard: [],
  };

  return drawCards(player, STARTING_HAND_SIZE);
}

// A teljes jatek kezdoallapota. Ezt hasznaljuk uj csata inditasakor is.
export function createInitialGame(): GameState {
  return {
    phase: 'start',
    gameMode: null,
    botDifficulty: null,
    turn: 1,
    activePlayer: 1,
    winner: null,
    players: {
      1: createPlayer(1, 'Player 1'),
      2: createPlayer(2, 'Player 2'),
    },
    board: createInitialBoard(),
    supportSlots: createInitialSupportSlots(),
    selectedUnit: null,
    battleStats: {
      1: createEmptyBattleStats(),
      2: createEmptyBattleStats(),
    },
    log: [{ id: 'welcome', text: 'Armored Generals ready. Player 1 begins.' }],
  };
}

// Uj csatanaplo sort tesz a lista elejere, es csak az utolso 8 bejegyzest tartja meg.
export function addLog(state: GameState, text: string): GameState {
  return {
    ...state,
    log: [{ id: makeInstanceId('log'), text }, ...state.log].slice(0, 8),
  };
}

// Elmenti a kivalasztott jatekmodot, beallitja a resztvevok neveit, majd megnyitja a HQ-valasztast.
export function startGame(state: GameState, gameMode: GameMode): GameState {
  return {
    ...state,
    phase: 'hqSelection',
    gameMode,
    botDifficulty: gameMode === 'pve' ? 'normal' : null,
    players: {
      1: { ...state.players[1], name: 'Player 1' },
      2: { ...state.players[2], name: gameMode === 'pve' ? 'AI Commander' : 'Player 2' },
    },
  };
}

// A ket nemzet kivalasztasa utan felepiti a HQ-kat es elinditja a tenyleges csatat.
export function beginBattle(
  state: GameState,
  nations: Record<PlayerId, HqNation>,
  botDifficulty?: BotDifficulty,
): GameState {
  if (state.phase !== 'hqSelection') {
    return state;
  }

  const player1Hq = hqDefinitions[nations[1]];
  const player2Hq = hqDefinitions[nations[2]];

  return addLog({
    ...state,
    phase: 'playing',
    botDifficulty: state.gameMode === 'pve' ? botDifficulty ?? state.botDifficulty ?? 'normal' : null,
    activePlayer: 1,
    winner: null,
    board: createInitialBoard(nations),
    supportSlots: createInitialSupportSlots(),
    selectedUnit: null,
    battleStats: {
      1: createEmptyBattleStats(),
      2: createEmptyBattleStats(),
    },
    players: {
      1: {
        ...state.players[1],
        faction: player1Hq.faction,
        baseHp: player1Hq.hp,
        maxBaseHp: player1Hq.hp,
        commandPoints: player1Hq.resource,
      },
      2: {
        ...state.players[2],
        faction: player2Hq.faction,
        baseHp: player2Hq.hp,
        maxBaseHp: player2Hq.hp,
        commandPoints: player2Hq.resource,
      },
    },
  }, `Battle started: ${player1Hq.nationName} versus ${player2Hq.nationName}.`);
}

// Minden sebzes utan ellenorzi, hogy valamelyik HQ elerte-e a 0 HP-t.
function withWinnerCheck(state: GameState): GameState {
  const player1Dead = state.players[1].baseHp <= 0;
  const player2Dead = state.players[2].baseHp <= 0;

  if (!player1Dead && !player2Dead) {
    return state;
  }

  const winner = player1Dead ? 2 : 1;
  // A legyozott HQ vizualisan is eltunik a boardrol, ugyanugy mint egy megsemmisult unit.
  const board = [...state.board];

  if (player1Dead) {
    board[HQ_SLOTS[1]] = null;
  }

  if (player2Dead) {
    board[HQ_SLOTS[2]] = null;
  }

  return addLog({ ...state, board, phase: 'gameOver', winner }, `Player ${winner} wins by destroying the enemy HQ.`);
}

// Kijatszik egy lapot az aktiv jatekos kezebol. Unit lap boardra kerul, command lap azonnal hat.
export function playCard(state: GameState, cardInstanceId: string, slotIndex?: number): GameState {
  if (state.phase !== 'playing') {
    return state;
  }

  const player = state.players[state.activePlayer];
  const card = player.hand.find((handCard) => handCard.instanceId === cardInstanceId);

  if (!card || card.cost > player.commandPoints) {
    return state;
  }

  const hand = player.hand.filter((handCard) => handCard.instanceId !== cardInstanceId);
  const updatedPlayer: PlayerState = {
    ...player,
    commandPoints: player.commandPoints - card.cost,
    hand,
  };

  // A React allapotot immutabilisan kezeljuk: nem modositjuk a regi objektumokat, hanem masolatokat keszitunk.
  let nextState: GameState = {
    ...state,
    selectedUnit: null,
    players: {
      ...state.players,
      [player.id]: updatedPlayer,
    },
  };

  if (card.type === 'unit') {
    // Unit laphoz a jatekosnak explicit tablan levo mezot kell valasztania.
    if (typeof slotIndex !== 'number') {
      return state;
    }

    const targetSlot = slotIndex;
    const isLegalDeploySlot = getDeployableSlots(nextState.board, player.id).includes(targetSlot);

    if (targetSlot < 0 || nextState.board[targetSlot] || !isLegalDeploySlot) {
      return state;
    }

    const unit: UnitInstance = {
      ...card,
      slotType: 'unit',
      owner: player.id,
      currentHp: card.hp ?? 1,
      // Deploy utan a unit mar tamadhat; light tanknak marad egy rovid ortogonalis lepese is.
      movesUsed: 1,
      hasAttacked: false,
      canCounterattackNextTurn: false,
    };

    const board = [...nextState.board];
    board[targetSlot] = unit;
    nextState = {
      ...nextState,
      board,
    };

    return addLog(addBattleStats(nextState, player.id, {
      unitsDeployed: 1,
      resourcesSpent: card.cost,
    }), `${player.name} deployed ${card.name}.`);
  }

  if (card.type === 'support') {
    // Support laphoz a jatekosnak a sajat support savjabol kell ures mezot valasztania.
    if (typeof slotIndex !== 'number' || !card.supportType || !getSupportDeployableSlots(nextState, player.id, card).includes(slotIndex)) {
      return state;
    }

    const support: SupportInstance = {
      ...card,
      slotType: 'support',
      owner: player.id,
      supportType: card.supportType,
      currentHp: card.hp ?? 1,
      attackBonus: card.attackBonus ?? 0,
      resource: card.resource ?? 0,
      usageHpCost: card.usageHpCost ?? 0,
    };

    const supportSlots = {
      ...nextState.supportSlots,
      [player.id]: [...nextState.supportSlots[player.id]],
    };
    supportSlots[player.id][slotIndex] = support;

    return addLog(addBattleStats({
      ...nextState,
      supportSlots,
    }, player.id, {
      supportsDeployed: 1,
      resourcesSpent: card.cost,
    }), `${player.name} deployed support ${card.name}.`);
  }

  const enemy = enemyOf(player.id);
  const damage = card.damage ?? 0;

  if (card.target === 'enemy_unit' || card.target === 'enemy_unit_or_hq') {
    if (typeof slotIndex !== 'number' || !getCommandTargetableSlots(state, card).includes(slotIndex)) {
      return state;
    }

    const board = [...nextState.board];
    const target = board[slotIndex];

    if (isUnit(target) && target.owner === enemy) {
      const targetHp = target.currentHp - Math.max(0, damage);
      const actualDamage = Math.min(target.currentHp, Math.max(0, damage));
      board[slotIndex] = targetHp > 0 ? { ...target, currentHp: targetHp } : null;

      return applyImmediateResourceLoss(state, addLog(addBattleStats({
        ...nextState,
        board,
        players: {
          ...nextState.players,
          [player.id]: {
            ...updatedPlayer,
            discard: [...updatedPlayer.discard, card],
          },
        },
      }, player.id, {
        commandCardsPlayed: 1,
        damageDealt: actualDamage,
        enemyUnitsDestroyed: targetHp > 0 ? 0 : 1,
        resourcesSpent: card.cost,
      }), targetHp > 0
        ? `${player.name} issued ${card.name}: ${target.name} took ${damage} damage.`
        : `${player.name} issued ${card.name}: ${target.name} was destroyed.`));
    }

    if (card.target !== 'enemy_unit_or_hq' || target?.slotType !== 'hq' || target.owner !== enemy) {
      return state;
    }

    const protectedHpBefore = getProtectedHqHp(nextState, enemy);
    const damagedState = applyDamageToHq(nextState, enemy, Math.max(0, damage));
    const actualDamage = Math.max(0, protectedHpBefore - getProtectedHqHp(damagedState, enemy));
    const discardedState: GameState = {
      ...damagedState,
      players: {
        ...damagedState.players,
        [player.id]: {
          ...damagedState.players[player.id],
          discard: [...updatedPlayer.discard, card],
        },
      },
    };

    return withWinnerCheck(applyImmediateResourceLoss(
      state,
      addLog(addBattleStats(discardedState, player.id, {
        commandCardsPlayed: 1,
        damageDealt: actualDamage,
        resourcesSpent: card.cost,
      }), `${player.name} issued ${card.name}: Player ${enemy} HQ took ${damage} damage.`),
    ));
  }

  if (card.commandEffect === 'opponent_discard_random') {
    const enemyPlayer = nextState.players[enemy];
    const randomIndex = enemyPlayer.hand.length > 0 ? Math.floor(Math.random() * enemyPlayer.hand.length) : -1;
    const discardedEnemyCard = randomIndex >= 0 ? enemyPlayer.hand[randomIndex] : null;
    const enemyHand = discardedEnemyCard
      ? enemyPlayer.hand.filter((_, index) => index !== randomIndex)
      : enemyPlayer.hand;
    const enemyDiscard = discardedEnemyCard
      ? [...enemyPlayer.discard, discardedEnemyCard]
      : enemyPlayer.discard;

    return addLog(addBattleStats({
      ...nextState,
      players: {
        ...nextState.players,
        [player.id]: {
          ...updatedPlayer,
          discard: [...updatedPlayer.discard, card],
        },
        [enemy]: {
          ...enemyPlayer,
          hand: enemyHand,
          discard: enemyDiscard,
        },
      },
    }, player.id, {
      commandCardsPlayed: 1,
      resourcesSpent: card.cost,
    }), discardedEnemyCard
      ? `${player.name} issued ${card.name}: Player ${enemy} discarded ${discardedEnemyCard.name}.`
      : `${player.name} issued ${card.name}, but Player ${enemy} had no cards to discard.`);
  }

  // Pozitiv damage alapbol az ellenfel HQ-jat sebzi, negativ damage a sajat HQ-t gyogyitja.
  const protectedHpBefore = getProtectedHqHp(nextState, enemy);
  const nextEnemyState = damage > 0 ? applyDamageToHq(nextState, enemy, damage) : nextState;
  const actualHqDamage = damage > 0 ? Math.max(0, protectedHpBefore - getProtectedHqHp(nextEnemyState, enemy)) : 0;
  const nextOwnBaseHp = damage < 0
    ? Math.min(updatedPlayer.maxBaseHp, updatedPlayer.baseHp + Math.abs(damage))
    : updatedPlayer.baseHp;

  nextState = {
    ...nextEnemyState,
    players: {
      ...nextEnemyState.players,
      [player.id]: {
        ...updatedPlayer,
        baseHp: nextOwnBaseHp,
        discard: [...updatedPlayer.discard, card],
      },
    },
  };

  return withWinnerCheck(applyImmediateResourceLoss(state, addLog(addBattleStats(nextState, player.id, {
    commandCardsPlayed: 1,
    damageDealt: actualHqDamage,
    resourcesSpent: card.cost,
  }), `${player.name} issued ${card.name}.`)));
}

// Kijelol egy sajat, meg nem hasznalt egyseget tamadashoz.
export function selectUnit(state: GameState, owner: PlayerId, slotIndex: number): GameState {
  const unit = state.board[slotIndex];
  const canStillMove = isUnit(unit)
    && unit.movesUsed < getMoveAllowance(unit)
    && !isArtillerySuppressed(state.board, unit, slotIndex)
    && getMovementNeighbors(unit, slotIndex).some((targetSlotIndex) => (
      !state.board[targetSlotIndex] && unit.movesUsed + getMoveCost(unit, slotIndex, targetSlotIndex) <= getMoveAllowance(unit)
    ));

  if (state.phase !== 'playing' || owner !== state.activePlayer || !isUnit(unit) || (unit.hasAttacked && !canStillMove)) {
    return state;
  }

  return {
    ...state,
    selectedUnit: { owner, slotIndex, actorType: 'unit' },
  };
}

// Kijeloli a sajat HQ-t lovéshez, ha az adott korben meg nem lott.
export function selectHq(state: GameState, owner: PlayerId, slotIndex: number): GameState {
  const hq = state.board[slotIndex];

  if (state.phase !== 'playing' || owner !== state.activePlayer || hq?.slotType !== 'hq' || hq.hasAttacked) {
    return state;
  }

  return {
    ...state,
    selectedUnit: { owner, slotIndex, actorType: 'hq' },
  };
}

// A kijelolt egyseget egy ures, nem atlos szomszedos mezore mozgatja.
export function moveUnit(state: GameState, targetSlotIndex: number): GameState {
  if (!state.selectedUnit || !getMovableSlots(state).includes(targetSlotIndex)) {
    return state;
  }

  const unit = state.board[state.selectedUnit.slotIndex];

  if (!isUnit(unit)) {
    return state;
  }

  const board = [...state.board];
  board[state.selectedUnit.slotIndex] = null;
  board[targetSlotIndex] = {
    ...unit,
    movesUsed: unit.movesUsed + getMoveCost(unit, state.selectedUnit.slotIndex, targetSlotIndex),
  };

  return addLog({
    ...state,
    board,
    selectedUnit: { owner: unit.owner, slotIndex: targetSlotIndex, actorType: 'unit' },
  }, `${unit.name} moved.`);
}

// A kijelolt egyseg vagy HQ megtamadja a szabalyok szerint elerheto ellenseges celpontot.
export function attack(state: GameState, targetSlotIndex?: number): GameState {
  if (!state.selectedUnit || typeof targetSlotIndex !== 'number' || !getAttackableSlots(state).includes(targetSlotIndex)) {
    return state;
  }

  const attackerOwner = state.selectedUnit.owner;
  const defenderOwner = enemyOf(attackerOwner);
  const attackerSlotIndex = state.selectedUnit.slotIndex;
  const attacker = state.board[attackerSlotIndex];

  if (state.selectedUnit.actorType === 'hq') {
    if (attacker?.slotType !== 'hq' || attacker.hasAttacked) {
      return state;
    }

    const board = [...state.board];
    const target = board[targetSlotIndex];
    const hqAttack = getHqAttack(attacker) + getSupportAttackBonus(state.supportSlots, attackerOwner);
    const nextState: GameState = {
      ...state,
      selectedUnit: null,
      board,
      supportSlots: consumeHqAttackSupportHp(state.supportSlots, attackerOwner),
    };

    board[attackerSlotIndex] = { ...attacker, hasAttacked: true };

    if (isUnit(target) && target.owner === defenderOwner) {
      const defenderHp = target.currentHp - hqAttack;
      const actualDamage = Math.min(target.currentHp, hqAttack);
      board[targetSlotIndex] = defenderHp > 0 ? { ...target, currentHp: defenderHp } : null;
      const text = defenderHp > 0
        ? `${attacker.name} hit ${target.name} for ${hqAttack}.`
        : `${attacker.name} destroyed ${target.name}.`;

      return applyImmediateResourceLoss(state, addLog(addBattleStats(nextState, attackerOwner, {
        damageDealt: actualDamage,
        enemyUnitsDestroyed: defenderHp > 0 ? 0 : 1,
      }), text));
    }

    if (target?.slotType !== 'hq' || target.owner !== defenderOwner) {
      return state;
    }

    const protectedHpBefore = getProtectedHqHp(nextState, defenderOwner);
    const damagedState = applyDamageToHq(nextState, defenderOwner, hqAttack);
    const actualDamage = Math.max(0, protectedHpBefore - getProtectedHqHp(damagedState, defenderOwner));

    return withWinnerCheck(applyImmediateResourceLoss(
      state,
      addLog(
        addBattleStats(damagedState, attackerOwner, { damageDealt: actualDamage }),
        `${attacker.name} hit Player ${defenderOwner} HQ for ${hqAttack}.`,
      ),
    ));
  }

  if (!isUnit(attacker) || attacker.hasAttacked) {
    return state;
  }

  const board = [...state.board];
  const target = typeof targetSlotIndex === 'number' ? board[targetSlotIndex] : null;
  const damage = attacker.attack ?? 0;

  // Tamadas utan az egyseg nem lephet tovabb ebben a korben.
  board[attackerSlotIndex] = {
    ...attacker,
    movesUsed: getMoveAllowance(attacker),
    hasAttacked: true,
    canCounterattackNextTurn: grantsCounterattackWindow(attacker),
  };

  let nextState: GameState = {
    ...state,
    selectedUnit: null,
    board,
  };

  if (isUnit(target) && target.owner === defenderOwner && typeof targetSlotIndex === 'number') {
    const canDefenderCounter = canCounterattack(target) && isAnyNeighbor(attackerSlotIndex, targetSlotIndex);
    const defenderCounterDamage = target.attack ?? 0;

    if (getUnitType(target) === 'tank_destroyer' && canDefenderCounter) {
      const attackerHpAfterCounter = attacker.currentHp - defenderCounterDamage;
      const counterDamage = Math.min(attacker.currentHp, defenderCounterDamage);

      if (attackerHpAfterCounter <= 0) {
        board[attackerSlotIndex] = null;
        board[targetSlotIndex] = { ...target, hasAttacked: true, canCounterattackNextTurn: false };

        return applyImmediateResourceLoss(state, addLog({
          ...addBattleStats(nextState, defenderOwner, {
            damageDealt: counterDamage,
            enemyUnitsDestroyed: 1,
          }),
          board,
        }, `${target.name} counterattacked first and destroyed ${attacker.name}.`));
      }

      const defenderHpAfterAttack = target.currentHp - damage;
      const attackerDamage = Math.min(target.currentHp, damage);
      board[attackerSlotIndex] = {
        ...attacker,
        currentHp: attackerHpAfterCounter,
        movesUsed: getMoveAllowance(attacker),
        hasAttacked: true,
        canCounterattackNextTurn: grantsCounterattackWindow(attacker),
      };
      board[targetSlotIndex] = defenderHpAfterAttack > 0
        ? { ...target, currentHp: defenderHpAfterAttack, hasAttacked: true, canCounterattackNextTurn: false }
        : null;

      const text = defenderHpAfterAttack > 0
        ? `${target.name} counterattacked first, then ${attacker.name} hit back.`
        : `${target.name} counterattacked first, but ${attacker.name} destroyed it.`;

      return applyImmediateResourceLoss(state, addLog({
        ...addBattleStats(addBattleStats(nextState, defenderOwner, {
          damageDealt: counterDamage,
        }), attackerOwner, {
          damageDealt: attackerDamage,
          enemyUnitsDestroyed: defenderHpAfterAttack > 0 ? 0 : 1,
        }),
        board,
      }, text));
    }

    const defenderHpAfterAttack = target.currentHp - damage;
    const attackerDamage = Math.min(target.currentHp, damage);

    if (defenderHpAfterAttack <= 0) {
      board[targetSlotIndex] = null;

      return applyImmediateResourceLoss(state, addLog({
        ...addBattleStats(nextState, attackerOwner, {
          damageDealt: attackerDamage,
          enemyUnitsDestroyed: 1,
        }),
        board,
      }, `${attacker.name} destroyed ${target.name}.`));
    }

    let survivingTarget: UnitInstance = { ...target, currentHp: defenderHpAfterAttack };
    let attackerAfterCounter: UnitInstance | null = {
      ...attacker,
      movesUsed: getMoveAllowance(attacker),
      hasAttacked: true,
      canCounterattackNextTurn: grantsCounterattackWindow(attacker),
    };

    if (canDefenderCounter) {
      const attackerHpAfterCounter = attackerAfterCounter.currentHp - defenderCounterDamage;
      const counterDamage = Math.min(attackerAfterCounter.currentHp, defenderCounterDamage);
      survivingTarget = { ...survivingTarget, hasAttacked: true, canCounterattackNextTurn: false };
      attackerAfterCounter = attackerHpAfterCounter > 0
        ? { ...attackerAfterCounter, currentHp: attackerHpAfterCounter }
        : null;

      nextState = addBattleStats(nextState, defenderOwner, {
        damageDealt: counterDamage,
        enemyUnitsDestroyed: attackerAfterCounter ? 0 : 1,
      });
    }

    board[attackerSlotIndex] = attackerAfterCounter;
    board[targetSlotIndex] = survivingTarget;

    nextState = {
      ...nextState,
      board,
    };

    nextState = addBattleStats(nextState, attackerOwner, { damageDealt: attackerDamage });

    if (!canDefenderCounter) {
      return applyImmediateResourceLoss(state, addLog(nextState, `${attacker.name} hit ${target.name} for ${damage}.`));
    }

    const text = attackerAfterCounter
      ? `${attacker.name} hit ${target.name} for ${damage}. ${target.name} counterattacked.`
      : `${attacker.name} hit ${target.name} for ${damage}. ${target.name} counterattacked and destroyed it.`;

    return applyImmediateResourceLoss(state, addLog(nextState, text));
  }

  if (target?.slotType !== 'hq' || target.owner !== defenderOwner) {
    return state;
  }

  // Ha a celpont az ellenseges HQ mezoje, a tamadas kozvetlenul az ellenfel HQ-jat sebzi.
  const protectedHpBefore = getProtectedHqHp(nextState, defenderOwner);
  nextState = applyDamageToHq(nextState, defenderOwner, damage);
  const actualDamage = Math.max(0, protectedHpBefore - getProtectedHqHp(nextState, defenderOwner));

  return withWinnerCheck(applyImmediateResourceLoss(
    state,
    addLog(addBattleStats(nextState, attackerOwner, { damageDealt: actualDamage }), `${attacker.name} hit Player ${defenderOwner} HQ for ${damage}.`),
  ));
}

// Atadja a kort a masik jatekosnak, frissiti a tamadasi jogot, huz 1 lapot es beallitja a CP-t.
export function endTurn(state: GameState): GameState {
  if (state.phase !== 'playing') {
    return state;
  }

  const nextPlayerId = enemyOf(state.activePlayer);
  const nextTurn = state.activePlayer === 2 ? state.turn + 1 : state.turn;
  const refreshedBoard = state.board.map((slot) => (
    isUnit(slot) && slot.owner === nextPlayerId
      ? { ...slot, movesUsed: 0, hasAttacked: false, canCounterattackNextTurn: false }
      : slot?.slotType === 'hq' && slot.owner === nextPlayerId
        ? { ...slot, hasAttacked: false }
        : slot
  ));
  const nextCommandPoints = getCommandPointsForTurn({
    ...state,
    board: refreshedBoard,
  }, nextPlayerId);
  const nextPlayer = drawCards(
    {
      ...state.players[nextPlayerId],
      commandPoints: nextCommandPoints,
    },
    1,
  );

  return withWinnerCheck(addLog({
    ...state,
    activePlayer: nextPlayerId,
    turn: nextTurn,
    selectedUnit: null,
    players: {
      ...state.players,
      [nextPlayerId]: nextPlayer,
    },
    board: refreshedBoard,
  }, `${nextPlayer.name}'s turn. Drew 1 card and starts with ${nextCommandPoints} CP.`));
}

export const gameConstants = {
  boardSlots: BOARD_SLOTS,
  boardRows: BOARD_ROWS,
  boardColumns: BOARD_COLUMNS,
  player1HqSlot: PLAYER_1_HQ_SLOT,
  player2HqSlot: PLAYER_2_HQ_SLOT,
  player1StartingBaseHp: hqDefinitions[DEFAULT_HQ_NATIONS[1]].hp,
  player2StartingBaseHp: hqDefinitions[DEFAULT_HQ_NATIONS[2]].hp,
};
