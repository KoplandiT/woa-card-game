type KeyframedValue<T> = {
  a: 1;
  k: Array<{
    t: number;
    s: T;
    e?: T;
    i?: { x: number[]; y: number[] };
    o?: { x: number[]; y: number[] };
  }>;
};

type StaticValue<T> = {
  a: 0;
  k: T;
};

type Transform = {
  a: StaticValue<[number, number, number]>;
  p: StaticValue<[number, number, number]>;
  s: StaticValue<[number, number, number]> | KeyframedValue<[number, number, number]>;
  r: StaticValue<number>;
  o: StaticValue<number> | KeyframedValue<[number]>;
};

type ShapeLayer = {
  ddd: 0;
  ind: number;
  ty: 4;
  nm: string;
  sr: 1;
  ks: Transform;
  ao: 0;
  shapes: unknown[];
  ip: 0;
  op: number;
  st: 0;
  bm: 0;
};

type LottieAnimation = {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm: string;
  ddd: 0;
  assets: [];
  layers: ShapeLayer[];
};

export type VfxKind = 'muzzle' | 'impact' | 'burn';
export type LottieVfxKind = Exclude<VfxKind, 'burn'>;

const easeOut = {
  i: { x: [0.16], y: [1] },
  o: { x: [0.3], y: [0] },
};

function staticValue<T>(value: T): StaticValue<T> {
  return { a: 0, k: value };
}

function keyframedValue<T>(frames: KeyframedValue<T>['k']): KeyframedValue<T> {
  return { a: 1, k: frames };
}

function transform(options: {
  position?: [number, number, number];
  scale?: StaticValue<[number, number, number]> | KeyframedValue<[number, number, number]>;
  rotation?: number;
  opacity?: StaticValue<number> | KeyframedValue<[number]>;
} = {}): Transform {
  return {
    a: staticValue([0, 0, 0]),
    p: staticValue(options.position ?? [100, 100, 0]),
    s: options.scale ?? staticValue([100, 100, 100]),
    r: staticValue(options.rotation ?? 0),
    o: options.opacity ?? staticValue(100),
  };
}

function ellipse(name: string, size: [number, number], color: [number, number, number], opacity = 100) {
  return [
    {
      ty: 'el',
      nm: `${name} Shape`,
      p: staticValue([0, 0]),
      s: staticValue(size),
      d: 1,
    },
    {
      ty: 'fl',
      nm: `${name} Fill`,
      c: staticValue(color),
      o: staticValue(opacity),
      r: 1,
    },
  ];
}

function rect(name: string, size: [number, number], color: [number, number, number], opacity = 100, radius = 18) {
  return [
    {
      ty: 'rc',
      nm: `${name} Shape`,
      p: staticValue([0, 0]),
      s: staticValue(size),
      r: staticValue(radius),
    },
    {
      ty: 'fl',
      nm: `${name} Fill`,
      c: staticValue(color),
      o: staticValue(opacity),
      r: 1,
    },
  ];
}

function layer(name: string, ind: number, shapes: unknown[], options: {
  position?: [number, number, number];
  scale?: StaticValue<[number, number, number]> | KeyframedValue<[number, number, number]>;
  rotation?: number;
  opacity?: StaticValue<number> | KeyframedValue<[number]>;
  op?: number;
} = {}): ShapeLayer {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: transform(options),
    ao: 0,
    shapes,
    ip: 0,
    op: options.op ?? 42,
    st: 0,
    bm: 0,
  };
}

function animation(name: string, op: number, layers: ShapeLayer[]): LottieAnimation {
  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op,
    w: 200,
    h: 200,
    nm: name,
    ddd: 0,
    assets: [],
    layers,
  };
}

const muzzleFlash = animation('Armored muzzle flash', 30, [
  layer('barrel flame', 1, rect('flame', [138, 18], [1, 0.76, 0.22], 95), {
    position: [126, 96, 0],
    rotation: -8,
    scale: keyframedValue([
      { t: 0, s: [8, 70, 100], e: [126, 100, 100], ...easeOut },
      { t: 8, s: [126, 100, 100], e: [168, 82, 100], ...easeOut },
      { t: 18, s: [168, 82, 100] },
    ]),
    opacity: keyframedValue([
      { t: 0, s: [0], e: [100], ...easeOut },
      { t: 6, s: [100], e: [28], ...easeOut },
      { t: 18, s: [28], e: [0], ...easeOut },
      { t: 28, s: [0] },
    ]),
    op: 30,
  }),
  layer('hot core', 2, ellipse('core', [54, 54], [1, 0.95, 0.65], 100), {
    position: [72, 98, 0],
    scale: keyframedValue([
      { t: 0, s: [22, 22, 100], e: [106, 106, 100], ...easeOut },
      { t: 10, s: [106, 106, 100], e: [70, 70, 100], ...easeOut },
      { t: 24, s: [70, 70, 100] },
    ]),
    opacity: keyframedValue([
      { t: 0, s: [0], e: [100], ...easeOut },
      { t: 4, s: [100], e: [0], ...easeOut },
      { t: 24, s: [0] },
    ]),
    op: 30,
  }),
]);

const impactBurst = animation('Armored impact burst', 42, [
  layer('impact shock ring', 1, ellipse('ring', [94, 94], [1, 0.78, 0.32], 55), {
    position: [100, 100, 0],
    scale: keyframedValue([
      { t: 0, s: [18, 18, 100], e: [118, 118, 100], ...easeOut },
      { t: 18, s: [118, 118, 100], e: [152, 152, 100], ...easeOut },
      { t: 34, s: [152, 152, 100] },
    ]),
    opacity: keyframedValue([
      { t: 0, s: [0], e: [92], ...easeOut },
      { t: 7, s: [92], e: [34], ...easeOut },
      { t: 24, s: [34], e: [0], ...easeOut },
      { t: 40, s: [0] },
    ]),
  }),
  layer('bright hit', 2, ellipse('hit', [58, 58], [1, 0.95, 0.68], 100), {
    position: [100, 100, 0],
    scale: keyframedValue([
      { t: 0, s: [18, 18, 100], e: [96, 96, 100], ...easeOut },
      { t: 8, s: [96, 96, 100], e: [54, 54, 100], ...easeOut },
      { t: 24, s: [54, 54, 100] },
    ]),
    opacity: keyframedValue([
      { t: 0, s: [0], e: [100], ...easeOut },
      { t: 5, s: [100], e: [0], ...easeOut },
      { t: 26, s: [0] },
    ]),
  }),
  layer('dark smoke', 3, ellipse('smoke', [88, 58], [0.14, 0.13, 0.11], 64), {
    position: [108, 114, 0],
    rotation: -12,
    scale: keyframedValue([
      { t: 8, s: [30, 22, 100], e: [110, 86, 100], ...easeOut },
      { t: 30, s: [110, 86, 100], e: [142, 98, 100], ...easeOut },
      { t: 42, s: [142, 98, 100] },
    ]),
    opacity: keyframedValue([
      { t: 0, s: [0], e: [68], ...easeOut },
      { t: 16, s: [68], e: [0], ...easeOut },
      { t: 42, s: [0] },
    ]),
  }),
]);

const lottieDataByKind: Record<LottieVfxKind, string> = {
  muzzle: JSON.stringify(muzzleFlash),
  impact: JSON.stringify(impactBurst),
};

export function getLottieEffectData(kind: LottieVfxKind): string {
  return lottieDataByKind[kind];
}
