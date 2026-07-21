import { getSupportSlotType, isActiveSupportSlot } from '../game/gameLogic';
import { loadPixiRuntime } from '../vfx/pixiRuntime';
import { BoardProjectile } from './BoardProjectile';
import { FuelPumpIcon } from './FuelPumpIcon';
import { SupportTypeIcon } from './SupportTypeIcon';
import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import type { BoardEffect, BoardSlot, PlayerId, PlayerState, SupportSlot, SupportType, UnitInstance, UnitType } from '../types';

const BoardVfx = lazy(() => import('./BoardVfx').then((module) => ({ default: module.BoardVfx })));

const unitTypeLabels: Record<UnitType, string> = {
  light_tank: 'Light tank',
  medium_tank: 'Medium tank',
  heavy_tank: 'Heavy tank',
  tank_destroyer: 'Tank destroyer',
  artillery: 'Artillery',
};

const supportTypeLabels: Record<SupportType, string> = {
  scout: 'Scout',
  medic: 'Medic',
  engineer: 'Engineer',
};

type BoardProps = {
  board: BoardSlot[];
  activePlayer: PlayerId;
  players: Record<PlayerId, PlayerState>;
  supportSlots: Record<PlayerId, SupportSlot[]>;
  boardEffect: BoardEffect | null;
  selectedUnit: { owner: PlayerId; slotIndex: number } | null;
  deployableSlots: number[];
  supportDeployableSlots: number[];
  movableSlots: number[];
  attackableSlots: number[];
  // Ezek callbackek: a Board nem modosit allapotot, csak szol az Appnak, mi tortent.
  onSelectUnit: (owner: PlayerId, slotIndex: number) => void;
  onSelectHq: (owner: PlayerId, slotIndex: number) => void;
  onAttackSlot: (slotIndex: number) => void;
  onMoveSlot: (slotIndex: number) => void;
  onDeploySlot: (slotIndex: number) => void;
  onDeploySupportSlot: (slotIndex: number) => void;
};

// Igaz, ha a mezon egyseg all. Ezzel a renderelesnel kulon kezelhetjuk a HQ-t es az ures mezot.
function isUnit(slot: BoardSlot): slot is UnitInstance {
  return slot?.slotType === 'unit';
}

function UnitTypeIcon({ unitType }: { unitType?: UnitType }) {
  if (unitType === 'artillery') {
    return <span className="unit-symbol unit-symbol--square" title={unitTypeLabels[unitType]} />;
  }

  if (unitType === 'tank_destroyer') {
    return <span className="unit-symbol unit-symbol--down" title={unitTypeLabels[unitType]} />;
  }

  const count = unitType === 'heavy_tank' ? 3 : unitType === 'medium_tank' ? 2 : 1;

  return (
    <span className={`unit-symbol-stack unit-symbol-stack--${unitType ?? 'unit'}`} title={unitType ? unitTypeLabels[unitType] : 'Unit'}>
      {Array.from({ length: count }).map((_, index) => (
        <span className="unit-symbol unit-symbol--up" key={index} />
      ))}
    </span>
  );
}

const tokenTransition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.82,
} as const;

const quickEffectTransition = {
  duration: 0.68,
  ease: 'easeOut',
} as const;

function getTokenInitialState(isDeployEffect: boolean) {
  return isDeployEffect
    ? { opacity: 0, y: -28, scale: 0.84, filter: 'brightness(1.8)' }
    : { opacity: 0, scale: 0.96 };
}

function getSlotAngle(sourceSlot?: number, targetSlot?: number) {
  if (typeof sourceSlot !== 'number' || typeof targetSlot !== 'number') {
    return 0;
  }

  const sourceColumn = sourceSlot % 5;
  const sourceRow = Math.floor(sourceSlot / 5);
  const targetColumn = targetSlot % 5;
  const targetRow = Math.floor(targetSlot / 5);

  return Math.atan2(targetRow - sourceRow, targetColumn - sourceColumn) * (180 / Math.PI);
}

// A csatateret jeleniti meg 3x5-os racskent, kartya-alaku unit es HQ tokenekkel.
export function Board({
  board,
  activePlayer,
  players,
  supportSlots,
  boardEffect,
  selectedUnit,
  deployableSlots,
  supportDeployableSlots,
  movableSlots,
  attackableSlots,
  onSelectUnit,
  onSelectHq,
  onAttackSlot,
  onMoveSlot,
  onDeploySlot,
  onDeploySupportSlot,
}: BoardProps) {
  // A PixiJS chunkot a board megjelenesekor elotolti, hogy az elso megsemmisulesnel
  // a WebGL inicializalas ne adjon extra kesleltetest a lovedek becsapodasahoz.
  useEffect(() => {
    void loadPixiRuntime();
  }, []);

  const renderCommandPointsBadge = (owner: PlayerId, position: 'top' | 'bottom') => (
    <div className={`board-command-points board-command-points--${position}`} title={`Player ${owner} command points`}>
      <FuelPumpIcon className="board-command-points__icon" />
      <span>{players[owner].commandPoints}</span>
    </div>
  );

  const renderSupportColumn = (owner: PlayerId) => (
    <aside className={`support-column support-column--player-${owner}`} aria-label={`Player ${owner} support slots`}>
      {owner === 2 ? renderCommandPointsBadge(owner, 'top') : null}
      <span className="support-column__label">P{owner} Support</span>
      {supportSlots[owner].map((support, index) => {
        const supportType = getSupportSlotType(index);
        const isActiveSlot = isActiveSupportSlot(index);
        const isDeployable = owner === activePlayer && supportDeployableSlots.includes(index);

        return (
          <button
            className={`support-slot ${isDeployable ? 'support-slot--deployable' : ''} ${!isActiveSlot ? 'support-slot--disabled' : ''}`}
            disabled={!isActiveSlot}
            key={`${owner}-${index}`}
            onClick={() => {
              if (isDeployable) {
                onDeploySupportSlot(index);
              }
            }}
          >
            {supportType ? (
              <SupportTypeIcon className="support-slot__icon" supportType={supportType} />
            ) : null}
            {support ? (
              <motion.span
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="support-token"
                initial={{ opacity: 0, scale: 0.88, y: -10 }}
                layout
                layoutId={`support-${support.instanceId}`}
                transition={tokenTransition}
              >
                <span className="support-token__name">{support.name}</span>
                {support.image ? <img className="support-token__image" src={support.image} alt={support.name} /> : null}
                <span className="support-token__stats">
                  <span>+{support.attackBonus ?? 0}</span>
                  <span>{support.currentHp}</span>
                  <span>R{support.resource ?? 0}</span>
                </span>
              </motion.span>
            ) : (
              <span className="support-slot__empty">
                {isActiveSlot ? (isDeployable ? 'Deploy' : supportType ? supportTypeLabels[supportType] : 'Empty') : 'Locked'}
              </span>
            )}
          </button>
        );
      })}
      {owner === 1 ? renderCommandPointsBadge(owner, 'bottom') : null}
    </aside>
  );

  return (
    <section className="battlefield" aria-label="Battlefield">
      <LayoutGroup>
      <div className="battlefield-layout">
        {renderSupportColumn(1)}
        <div className="board-grid">
        <AnimatePresence>
          {boardEffect
            && (boardEffect.type === 'attack' || boardEffect.type === 'destroy')
            && typeof boardEffect.sourceSlot === 'number'
            && typeof boardEffect.targetSlot === 'number' ? (
              <BoardProjectile
                effectId={boardEffect.id}
                key={`projectile-${boardEffect.id}`}
                sourceSlot={boardEffect.sourceSlot}
                targetSlot={boardEffect.targetSlot}
              />
            ) : null}
        </AnimatePresence>
        {board.map((slot, index) => {
          const isSelected = selectedUnit?.slotIndex === index;
          const isTargetable = attackableSlots.includes(index);
          const isMovable = movableSlots.includes(index);
          const isDeployable = deployableSlots.includes(index);
          const isSpent = (isUnit(slot) || slot?.slotType === 'hq') && slot.hasAttacked;
          const row = Math.floor(index / 5) + 1;
          const column = (index % 5) + 1;
          const hqAttackBonus = slot?.slotType === 'hq'
            ? supportSlots[slot.owner].reduce((total, support) => total + (support?.attackBonus ?? 0), 0)
            : 0;
          const hqResourceBonus = slot?.slotType === 'hq'
            ? supportSlots[slot.owner].reduce((total, support) => total + (support?.resource ?? 0), 0)
            : 0;
          const isEffectSource = boardEffect?.sourceSlot === index;
          const isEffectTarget = boardEffect?.targetSlot === index;
          const effectClass = [
            isEffectSource && boardEffect?.type === 'attack' ? 'slot--effect-attack-source' : '',
            isEffectSource && boardEffect?.type === 'move' ? 'slot--effect-move-source' : '',
            isEffectTarget && boardEffect?.type === 'attack' ? 'slot--effect-attack-target' : '',
            isEffectTarget && boardEffect?.type === 'deploy' ? 'slot--effect-deploy' : '',
            isEffectTarget && boardEffect?.type === 'move' ? 'slot--effect-move-target' : '',
            isEffectTarget && boardEffect?.type === 'destroy' ? 'slot--effect-destroy' : '',
          ].filter(Boolean).join(' ');
          const isDeployEffect = isEffectTarget && boardEffect?.type === 'deploy';
          const isMoveSourceEffect = isEffectSource && boardEffect?.type === 'move';
          const isMoveTargetEffect = isEffectTarget && boardEffect?.type === 'move';
          const sourceVfx = isEffectSource && (boardEffect?.type === 'attack' || boardEffect?.type === 'destroy') ? 'muzzle' : null;
          const targetVfx = isEffectTarget && boardEffect?.type === 'attack'
            ? 'impact'
            : isEffectTarget && boardEffect?.type === 'destroy'
              ? 'burn'
              : null;
          const shouldLayerDestroyImpact = isEffectTarget && boardEffect?.type === 'destroy';
          const shotAngle = getSlotAngle(boardEffect?.sourceSlot, boardEffect?.targetSlot);

          return (
            <button
              key={index}
              className={`slot ${slot?.slotType === 'hq' ? 'slot--hq' : ''} ${isSelected ? 'slot--selected' : ''} ${
                isTargetable ? 'slot--targetable' : ''
              } ${isMovable ? 'slot--movable' : ''} ${isDeployable ? 'slot--deployable' : ''} ${
                isSpent ? 'slot--spent' : ''
              } ${effectClass}`}
              onClick={() => {
                if (isDeployable) {
                  onDeploySlot(index);
                } else if (isMovable) {
                  onMoveSlot(index);
                } else if (isTargetable) {
                  onAttackSlot(index);
                } else if (isUnit(slot)) {
                  onSelectUnit(slot.owner, index);
                } else if (slot?.slotType === 'hq') {
                  onSelectHq(slot.owner, index);
                }
              }}
            >
              <Suspense fallback={null}>
                <AnimatePresence>
                  {sourceVfx && boardEffect ? (
                    <BoardVfx angle={shotAngle} effectId={boardEffect.id} kind={sourceVfx} slotRole="source" />
                  ) : null}
                  {shouldLayerDestroyImpact && boardEffect ? (
                    <BoardVfx
                      delay={typeof boardEffect.sourceSlot === 'number' ? 0.46 : 0}
                      effectId={boardEffect.id}
                      kind="impact"
                      slotRole="target"
                    />
                  ) : null}
                  {targetVfx && boardEffect ? (
                    <BoardVfx
                      delay={typeof boardEffect.sourceSlot === 'number' ? 0.46 : 0}
                      effectId={boardEffect.id}
                      image={boardEffect.destroyedSlot?.image}
                      kind={targetVfx}
                      slotRole="target"
                    />
                  ) : null}
                </AnimatePresence>
              </Suspense>

              {isDeployEffect ? (
                <motion.span
                  animate={{ opacity: 0, scale: 1.25 }}
                  className="slot-motion-effect slot-motion-effect--deploy-ring"
                  initial={{ opacity: 0.95, scale: 0.72 }}
                  transition={{ duration: 0.72, ease: 'easeOut' }}
                />
              ) : null}

              {isMoveSourceEffect ? (
                <motion.span
                  animate={{ opacity: 0, scale: 0.92 }}
                  className="slot-motion-effect slot-motion-effect--move-source"
                  initial={{ opacity: 0.7, scale: 1 }}
                  transition={quickEffectTransition}
                />
              ) : null}

              {isMoveTargetEffect ? (
                <motion.span
                  animate={{ opacity: 0, scaleX: 1.45 }}
                  className="slot-motion-effect slot-motion-effect--move-dust"
                  initial={{ opacity: 0.7, scaleX: 0.5 }}
                  transition={{ duration: 0.62, ease: 'easeOut' }}
                />
              ) : null}

              {slot?.slotType === 'hq' ? (
                <motion.span
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'brightness(1)' }}
                  className="combat-card combat-card--board combat-card--hq"
                  initial={getTokenInitialState(isDeployEffect)}
                  layout
                  layoutId={`hq-${slot.owner}`}
                  transition={tokenTransition}
                >
                  <span className="combat-card__resource">{slot.resource + hqResourceBonus}</span>
                  <span className="combat-card__type-icon combat-card__type-icon--hq">HQ</span>
                  <span className="combat-card__title">{slot.name}</span>
                  <span className="combat-card__image">
                    {slot.image ? (
                      <img className="combat-card__portrait" src={slot.image} alt={slot.name} />
                    ) : (
                      <span className="combat-card__image-label">HQ image</span>
                    )}
                    <span className="combat-card__stat combat-card__stat--attack">{slot.attack + hqAttackBonus}</span>
                    <span className="combat-card__stat combat-card__stat--hp">{players[slot.owner].baseHp}</span>
                  </span>
                  <span className="combat-card__board-state">{slot.hasAttacked ? 'Spent' : 'Ready'}</span>
                </motion.span>
              ) : null}

              {isUnit(slot) ? (
                <motion.span
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'brightness(1)' }}
                  className="combat-card combat-card--board combat-card--unit-token"
                  initial={getTokenInitialState(isDeployEffect)}
                  layout
                  layoutId={`unit-${slot.instanceId}`}
                  transition={tokenTransition}
                >
                  <span className="combat-card__resource">{slot.resource ?? 0}</span>
                  <span className="combat-card__type-icon">
                    <UnitTypeIcon unitType={slot.unitType} />
                  </span>
                  <span className="combat-card__title">{slot.name}</span>
                  <span className="combat-card__image">
                    {slot.image ? (
                      <img className="combat-card__portrait" src={slot.image} alt={slot.name} />
                    ) : (
                      <span className="combat-card__image-label">Tank image</span>
                    )}
                    <span className="combat-card__stat combat-card__stat--attack">{slot.attack}</span>
                    <span className="combat-card__stat combat-card__stat--hp">{slot.currentHp}</span>
                  </span>
                </motion.span>
              ) : null}

              {!slot ? (
                <span className="empty-slot">
                  <span>{isDeployable ? 'Deploy zone' : isMovable ? 'Move zone' : 'Terrain sector'}</span>
                  <small>R{row} C{column}</small>
                </span>
              ) : null}
            </button>
          );
        })}
        </div>
        {renderSupportColumn(2)}
      </div>
      </LayoutGroup>
    </section>
  );
}
