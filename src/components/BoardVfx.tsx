import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getLottieEffectData, type VfxKind } from '../vfx/lottieEffects';
import { PixiDestructionVfx } from './PixiDestructionVfx';

type BoardVfxProps = {
  angle?: number;
  delay?: number;
  effectId: number;
  image?: string;
  kind: VfxKind;
  slotRole: 'source' | 'target';
};

const vfxSpeed: Record<VfxKind, number> = {
  muzzle: 1.45,
  impact: 1.18,
  burn: 0.58,
};

const vfxClassByKind: Record<VfxKind, string> = {
  muzzle: 'board-vfx--muzzle',
  impact: 'board-vfx--impact',
  burn: 'board-vfx--burn',
};

// Egyszeri board VFX lejatszo. A Lottie effektek mountolasat kesleltetjuk,
// a Pixi burn effekt viszont elore mountol, hogy a WebGL init ne okozzon szunetet.
export function BoardVfx({ angle = 0, delay = 0, effectId, image, kind, slotRole }: BoardVfxProps) {
  const shouldDelayMount = kind !== 'burn' && delay > 0;
  const [isReady, setIsReady] = useState(!shouldDelayMount);

  useEffect(() => {
    if (!shouldDelayMount) {
      setIsReady(true);
      return undefined;
    }

    setIsReady(false);
    const timeoutId = window.setTimeout(() => setIsReady(true), delay * 1000);
    return () => window.clearTimeout(timeoutId);
  }, [delay, effectId, shouldDelayMount]);

  if (!isReady) {
    return null;
  }

  return (
    <motion.span
      animate={{ opacity: 1 }}
      className={`board-vfx ${vfxClassByKind[kind]} board-vfx--${slotRole}`}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      key={`${effectId}-${kind}-${slotRole}`}
      style={kind === 'muzzle' ? { rotate: angle } : undefined}
      transition={{ duration: 0.12, ease: 'easeOut' }}
    >
      {kind === 'burn' ? (
        <PixiDestructionVfx delay={delay} image={image} />
      ) : (
        <DotLottieReact
          autoplay
          data={getLottieEffectData(kind)}
          height={200}
          loop={false}
          renderConfig={{ autoResize: false, devicePixelRatio: 1 }}
          speed={vfxSpeed[kind]}
          width={200}
        />
      )}
    </motion.span>
  );
}
