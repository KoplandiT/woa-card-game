import { AnimatePresence, motion } from 'motion/react';
import { CardView } from './CardView';
import type { CardInstance } from '../types';

type HandProps = {
  cards: CardInstance[];
  commandPoints: number;
  canDeployUnit: boolean;
  isInteractionLocked?: boolean;
  isHidden?: boolean;
  selectedCardId: string | null;
  canPlayCard?: (card: CardInstance) => boolean;
  onPlayCard: (cardId: string) => void;
};

// Az aktiv jatekos kezeben levo lapokat listazza, es kiszamolja, melyik jatszhato ki.
export function Hand({
  cards,
  commandPoints,
  canDeployUnit,
  isInteractionLocked = false,
  isHidden = false,
  selectedCardId,
  canPlayCard,
  onPlayCard,
}: HandProps) {
  if (isHidden) {
    return (
      <section className="hand hand--hidden" aria-label="Hidden AI hand">
        <AnimatePresence initial={false}>
          {cards.map((card) => (
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="card card--back"
              exit={{ opacity: 0, y: -18, scale: 0.92, transition: { duration: 0.18 } }}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              key={card.instanceId}
              layout
              transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.78 }}
            >
              <span className="card-back" aria-hidden="true">
                <span className="card-back__mark">AG</span>
                <span className="card-back__title">Armored Generals</span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </section>
    );
  }

  return (
    <section className="hand" aria-label="Player hand">
      <AnimatePresence initial={false}>
      {cards.map((card) => {
        const hasEnoughCommandPoints = card.cost <= commandPoints;
        const hasLegalDeploySlot = card.type !== 'unit' || canDeployUnit;
        const hasLegalCardTarget = canPlayCard?.(card) ?? true;

        return (
          <CardView
            key={card.instanceId}
            card={card}
            canPlay={!isInteractionLocked && hasEnoughCommandPoints && hasLegalDeploySlot && hasLegalCardTarget}
            isSelected={selectedCardId === card.instanceId}
            onPlay={onPlayCard}
          />
        );
      })}
      </AnimatePresence>
    </section>
  );
}
