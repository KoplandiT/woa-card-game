import { motion } from 'motion/react';

type BoardProjectileProps = {
  effectId: number;
  sourceSlot: number;
  targetSlot: number;
};

const BOARD_COLUMNS = 5;
const BOARD_ROWS = 3;

// A slot indexbol kiszamolja a mezo kozeppontjat a teljes board szazalekos koordinatain.
function getSlotCenter(slotIndex: number) {
  const column = slotIndex % BOARD_COLUMNS;
  const row = Math.floor(slotIndex / BOARD_COLUMNS);

  return {
    x: ((column + 0.5) / BOARD_COLUMNS) * 100,
    y: ((row + 0.5) / BOARD_ROWS) * 100,
  };
}

// A source es target slot kozott egyszer vegigfuto lovedek/tracer animacio.
export function BoardProjectile({ effectId, sourceSlot, targetSlot }: BoardProjectileProps) {
  const source = getSlotCenter(sourceSlot);
  const target = getSlotCenter(targetSlot);
  const angle = Math.atan2(target.y - source.y, target.x - source.x) * (180 / Math.PI);

  return (
    <motion.span
      animate={{
        left: `${target.x}%`,
        top: `${target.y}%`,
        opacity: [0, 1, 1, 0],
        scale: [0.55, 1, 1, 0.72],
      }}
      className="board-projectile"
      initial={{ left: `${source.x}%`, top: `${source.y}%`, opacity: 0, scale: 0.55 }}
      key={`projectile-${effectId}`}
      style={{ rotate: angle }}
      transition={{
        duration: 0.52,
        ease: 'easeInOut',
        times: [0, 0.12, 0.82, 1],
      }}
    />
  );
}
