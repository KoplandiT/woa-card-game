import { motion } from 'motion/react';
import { SupportTypeIcon } from './SupportTypeIcon';
import type { CardInstance, UnitType } from '../types';

const unitTypeLabels: Record<UnitType, string> = {
  light_tank: 'Light tank',
  medium_tank: 'Medium tank',
  heavy_tank: 'Heavy tank',
  tank_destroyer: 'Tank destroyer',
  artillery: 'Artillery',
};

type CardViewProps = {
  card: CardInstance;
  // Akkor igaz, ha az aktiv jatekosnak van eleg parancspontja a lap kijatszasahoz.
  canPlay?: boolean;
  isSelected?: boolean;
  // A szulo komponensnek visszajelezzuk, melyik konkret lappeldanyt akarja kijatszani a jatekos.
  onPlay?: (cardId: string) => void;
};

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

// Egyetlen kartyat jelenit meg: cost, resource, unit tipus, kepzona, attack/HP es leiras.
export function CardView({ card, canPlay = false, isSelected = false, onPlay }: CardViewProps) {
  const isUnit = card.type === 'unit';
  const isSupport = card.type === 'support';
  const hoverAnimation = canPlay ? { y: -6.5, scale: 1.25 } : undefined;

  return (
    <motion.button
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`card ${canPlay ? 'card--playable' : ''} ${isSelected ? 'card--selected' : ''}`}
      exit={{ opacity: 0, y: -18, scale: 0.92, transition: { duration: 0.18 } }}
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      layout
      onClick={() => onPlay?.(card.instanceId)}
      disabled={!canPlay}
      title={canPlay ? 'Play card' : card.text}
      transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.78 }}
      whileHover={hoverAnimation}
      whileTap={canPlay ? { scale: 0.98 } : undefined}
    >
      <span className={`combat-card combat-card--hand ${!isUnit ? 'combat-card--command' : ''} ${isSupport ? 'combat-card--support' : ''}`}>
        <span className="combat-card__cost">{card.cost}</span>
        <span className="combat-card__resource">{isUnit || isSupport ? card.resource ?? 0 : Math.abs(card.damage ?? 0)}</span>
        <span className="combat-card__type-icon">
          {isUnit ? (
            <UnitTypeIcon unitType={card.unitType} />
          ) : isSupport ? (
            <SupportTypeIcon className="combat-card__support-icon" supportType={card.supportType} />
          ) : (
            <span className="unit-symbol unit-symbol--order" />
          )}
        </span>
        <span className="combat-card__title">{card.name}</span>
        <span className="combat-card__image">
          {card.image ? (
            <img className="combat-card__portrait" src={card.image} alt={card.name} />
          ) : (
            <span className="combat-card__image-label">{isUnit ? 'Tank image' : 'Order image'}</span>
          )}
          <span className="combat-card__stat combat-card__stat--attack">{isUnit ? card.attack ?? 0 : isSupport ? card.attackBonus ?? 0 : card.cost}</span>
          <span className="combat-card__stat combat-card__stat--hp">{isUnit || isSupport ? card.hp ?? 0 : Math.abs(card.damage ?? 0)}</span>
        </span>
        <span className="combat-card__description">
          <span>{card.text}</span>
          {isUnit ? <small>{card.unitType ? unitTypeLabels[card.unitType] : 'Unit'}</small> : null}
          {isSupport ? <small>{card.supportType ? `Support / ${card.supportType}` : 'Support'}</small> : null}
        </span>
      </span>
    </motion.button>
  );
}
