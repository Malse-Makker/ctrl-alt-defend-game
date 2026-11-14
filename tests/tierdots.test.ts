// Tier dots on the towers: one per tier bought, in the path's colour.

import { describe, expect, it } from 'vitest';
import { TOWERS } from '../src/sim/data/towers';
import { tierDots } from '../src/render/tierdots';

describe('tier dots', () => {
  it('a new tower has none', () => {
    expect(tierDots(TOWERS.autoreply, [0, 0, 0])).toEqual([]);
  });

  it('one dot per tier, in the colour of its path', () => {
    const d = tierDots(TOWERS.autoreply, [4, 2, 0]);
    expect(d.length).toBe(6);
    expect(d.filter((x) => x.path === 0).every((x) => x.color === TOWERS.autoreply.paths[0].color)).toBe(true);
    expect(d.filter((x) => x.path === 1).length).toBe(2);
  });

  it('a row per path, and the lights in a row never touch', () => {
    for (const def of Object.values(TOWERS)) {
      const d = tierDots(def, [4, 4, 4]);
      for (let p = 0; p < 3; p++) {
        const xs = d.filter((x) => x.row === p).map((x) => x.x).sort((a, b) => a - b);
        expect(xs.length).toBe(4);
        for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThan(0.08);
        // On the cabinet front, which is 0.78 wide.
        for (const x of xs) expect(Math.abs(x)).toBeLessThan(0.33);
      }
    }
  });
});
