import type { LevelDef } from '../src/sim/data/levels';

/** A straight test corridor: walkway along y = 2.5 from x = -1 to x = 20. */
export function corridor(waves: string[], extra: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 1,
    name: 'Test Corridor',
    block: 'junior',
    intro: '',
    gimmick: '',
    size: { w: 21, h: 6 },
    paths: [
      [
        { x: -1, y: 2.5 },
        { x: 20, y: 2.5 },
      ],
    ],
    desk: { x: 20, y: 2 },
    decor: [],
    towers: ['coffee', 'autoreply'],
    startFocus: 100,
    waves,
    ...extra,
  };
}
