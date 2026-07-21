export type PlayerId = 1 | 2;
export type GameMode = 'pvp' | 'pve';
export type BotDifficulty = 'easy' | 'normal' | 'hard';
export type HqNation = 'germany' | 'soviet' | 'usa';
export type CardType = 'unit' | 'command' | 'support';
export type FactionId = 'iron_vanguard' | 'skyforge_alliance' | 'red_dune_corps';
export type UnitType = 'light_tank' | 'medium_tank' | 'heavy_tank' | 'tank_destroyer' | 'artillery';
export type CommandTarget = 'own_hq' | 'enemy_hq' | 'enemy_unit' | 'enemy_unit_or_hq';
export type CommandEffect = 'opponent_discard_random';
export type SupportType = 'scout' | 'medic' | 'engineer';

export type CardDefinition = {
  id: string;
  name: string;
  type: CardType;
  faction: FactionId;
  cost: number;
  image?: string;
  unitType?: UnitType;
  attack?: number;
  hp?: number;
  resource?: number;
  attackBonus?: number;
  usageHpCost?: number;
  supportType?: SupportType;
  damage?: number;
  target?: CommandTarget;
  commandEffect?: CommandEffect;
  armor?: number;
  text: string;
};

export type CardInstance = CardDefinition & {
  instanceId: string;
};

export type UnitInstance = CardInstance & {
  slotType: 'unit';
  owner: PlayerId;
  currentHp: number;
  movesUsed: number;
  hasAttacked: boolean;
  canCounterattackNextTurn: boolean;
};

export type HqSlot = {
  slotType: 'hq';
  owner: PlayerId;
  nation: HqNation;
  name: string;
  attack: number;
  hp: number;
  resource: number;
  image?: string;
  hasAttacked: boolean;
};

export type SupportInstance = CardInstance & {
  slotType: 'support';
  owner: PlayerId;
  supportType: SupportType;
  currentHp: number;
  attackBonus: number;
  resource: number;
  usageHpCost: number;
};

export type BoardSlot = UnitInstance | HqSlot | null;
export type SupportSlot = SupportInstance | null;

export type PlayerState = {
  id: PlayerId;
  name: string;
  faction: FactionId;
  baseHp: number;
  maxBaseHp: number;
  commandPoints: number;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
};

export type GameLogEntry = {
  id: string;
  text: string;
};

export type PlayerBattleStats = {
  damageDealt: number;
  enemyUnitsDestroyed: number;
  unitsDeployed: number;
  supportsDeployed: number;
  commandCardsPlayed: number;
  resourcesSpent: number;
};

export type GameState = {
  phase: 'start' | 'hqSelection' | 'playing' | 'gameOver';
  gameMode: GameMode | null;
  botDifficulty: BotDifficulty | null;
  turn: number;
  activePlayer: PlayerId;
  winner: PlayerId | null;
  players: Record<PlayerId, PlayerState>;
  board: BoardSlot[];
  supportSlots: Record<PlayerId, SupportSlot[]>;
  selectedUnit: { owner: PlayerId; slotIndex: number; actorType: 'unit' | 'hq' } | null;
  battleStats: Record<PlayerId, PlayerBattleStats>;
  log: GameLogEntry[];
};

// Az emberi UI es a kesobbi AI kozos, szerializalhato jatekparancsai.
export type GameAction =
  | { type: 'play_card'; cardInstanceId: string; targetSlotIndex?: number }
  | { type: 'move_unit'; sourceSlotIndex: number; targetSlotIndex: number }
  | { type: 'attack'; sourceSlotIndex: number; targetSlotIndex: number }
  | { type: 'end_turn' };

export type BoardEffect = {
  id: number;
  type: 'deploy' | 'move' | 'attack' | 'destroy';
  sourceSlot?: number;
  targetSlot?: number;
  destroyedSlot?: Exclude<BoardSlot, null>;
};
