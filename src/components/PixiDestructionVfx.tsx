import { useEffect, useRef } from 'react';
import type { Application, Graphics } from 'pixi.js';
import { loadPixiRuntime } from '../vfx/pixiRuntime';

type PixiDestructionVfxProps = {
  delay?: number;
  image?: string;
};

type Particle = {
  graphic: Graphics;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  delay: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function mixColor(from: number, to: number, progress: number) {
  const fromRed = (from >> 16) & 255;
  const fromGreen = (from >> 8) & 255;
  const fromBlue = from & 255;
  const toRed = (to >> 16) & 255;
  const toGreen = (to >> 8) & 255;
  const toBlue = to & 255;

  const red = Math.round(fromRed + (toRed - fromRed) * progress);
  const green = Math.round(fromGreen + (toGreen - fromGreen) * progress);
  const blue = Math.round(fromBlue + (toBlue - fromBlue) * progress);
  return (red << 16) | (green << 8) | blue;
}

// PixiJS-sel a megsemmisult token kepet elszenesiti, majd fusttel es szikrekkal eltunteti.
export function PixiDestructionVfx({ delay = 0, image }: PixiDestructionVfxProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const effectRequestedAt = performance.now();
    let app: Application | null = null;
    let cancelled = false;

    const setup = async () => {
      const { Application: PixiApplication, Assets, Container, Graphics, Sprite } = await loadPixiRuntime();
      const nextApp = new PixiApplication();
      app = nextApp;
      await nextApp.init({
        width: 200,
        height: 200,
        backgroundAlpha: 0,
        antialias: true,
        resolution: 1,
        preference: 'webgl',
      });

      if (cancelled || !host) {
        nextApp.destroy(true, { children: true });
        return;
      }

      nextApp.canvas.className = 'pixi-destruction-canvas';
      host.appendChild(nextApp.canvas);
      nextApp.stage.alpha = 0;

      const token = new Container();
      const frame = new Graphics()
        .roundRect(22, 14, 156, 172, 8)
        .fill({ color: 0x171914, alpha: 0.98 })
        .stroke({ color: 0xd9ca9f, width: 2, alpha: 0.42 });
      token.addChild(frame);

      let portrait: InstanceType<typeof Sprite> | null = null;

      if (image) {
        void Assets.load(image)
          .then((texture) => {
            if (cancelled) {
              return;
            }

            portrait = new Sprite(texture);
            portrait.x = 28;
            portrait.y = 20;
            portrait.width = 144;
            portrait.height = 160;
            token.addChildAt(portrait, 1);
          })
          .catch(() => undefined);
      }

      const charLayer = new Graphics()
        .roundRect(25, 17, 150, 166, 7)
        .fill({ color: 0x090907, alpha: 1 });
      charLayer.alpha = 0;
      token.addChild(charLayer);

      nextApp.stage.addChild(token);

      const smokeParticles: Particle[] = Array.from({ length: 14 }, (_, index) => {
        const radius = 13 + Math.random() * 16;
        const graphic = new Graphics().circle(0, 0, radius).fill({
          color: index % 3 === 0 ? 0x625849 : 0x292a26,
          alpha: 0.55,
        });
        graphic.alpha = 0;
        nextApp.stage.addChild(graphic);
        return {
          graphic,
          startX: 62 + Math.random() * 82,
          startY: 76 + Math.random() * 68,
          velocityX: -22 + Math.random() * 44,
          velocityY: -48 - Math.random() * 42,
          delay: index * 0.015,
        };
      });

      const emberParticles: Particle[] = Array.from({ length: 24 }, (_, index) => {
        const radius = 1.4 + Math.random() * 2.3;
        const graphic = new Graphics().circle(0, 0, radius).fill({
          color: index % 2 === 0 ? 0xffd45b : 0xff4a1f,
          alpha: 1,
        });
        graphic.blendMode = 'add';
        graphic.alpha = 0;
        nextApp.stage.addChild(graphic);
        const angle = Math.random() * Math.PI * 2;
        const speed = 38 + Math.random() * 74;
        return {
          graphic,
          startX: 100,
          startY: 101,
          velocityX: Math.cos(angle) * speed,
          velocityY: Math.sin(angle) * speed - 18,
          delay: index * 0.012,
        };
      });

      const startedAt = effectRequestedAt + delay * 1000;
      const duration = 2200;

      nextApp.ticker.add(() => {
        const elapsed = performance.now() - startedAt;

        if (elapsed < 0) {
          nextApp.stage.alpha = 0;
          return;
        }

        nextApp.stage.alpha = 1;
        const progress = clamp(elapsed / duration);
        const burn = clamp((progress - 0.08) / 0.38);
        const fade = clamp((progress - 0.7) / 0.3);

        charLayer.alpha = burn * 0.78;
        token.alpha = 1 - fade;

        if (portrait) {
          portrait.tint = progress < 0.3
            ? mixColor(0xffffff, 0xff3c22, clamp(progress / 0.3))
            : mixColor(0xff3c22, 0x292721, clamp((progress - 0.3) / 0.42));
        }

        smokeParticles.forEach((particle) => {
          const particleProgress = clamp((progress - particle.delay - 0.12) / 0.78);
          particle.graphic.x = particle.startX + particle.velocityX * particleProgress;
          particle.graphic.y = particle.startY + particle.velocityY * particleProgress;
          particle.graphic.scale.set(0.45 + particleProgress * 1.25);
          particle.graphic.alpha = Math.sin(particleProgress * Math.PI) * 0.58 * (1 - fade * 0.6);
        });

        emberParticles.forEach((particle) => {
          const particleProgress = clamp((progress - particle.delay) / 0.48);
          particle.graphic.x = particle.startX + particle.velocityX * particleProgress;
          particle.graphic.y = particle.startY + particle.velocityY * particleProgress + 34 * particleProgress * particleProgress;
          particle.graphic.alpha = Math.sin(particleProgress * Math.PI) * (1 - fade);
          particle.graphic.scale.set(1 - particleProgress * 0.55);
        });

        if (progress >= 1) {
          nextApp.ticker.stop();
          nextApp.stage.alpha = 0;
        }
      });
    };

    setup().catch(() => {
      if (host) {
        host.dataset.failed = 'true';
      }
    });

    return () => {
      cancelled = true;
      app?.destroy(true, { children: true });
      app = null;
    };
  }, [delay, image]);

  return <div className="pixi-destruction-vfx" ref={hostRef} />;
}
