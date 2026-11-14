// Lights on the front of a tower's cabinet: one per tier bought, in the colour of its path, a row
// per path, like the pips in the panel. You see what is in a tower without clicking it. Pure, so it
// can be tested without a scene.

import type { Tiers, TowerDef } from '../sim/data/towers';

export interface Dot {
  path: number;
  color: string;
  /** Across the front (tile units, 0 = middle). */
  x: number;
  /** Which row from the top: path 1 on top, path 3 at the bottom. */
  row: number;
}

const STEP = 0.11;

export function tierDots(def: Pick<TowerDef, 'paths'>, tiers: Tiers): Dot[] {
  const dots: Dot[] = [];
  tiers.forEach((n, p) => {
    const path = def.paths[p];
    if (!path) return;
    for (let i = 0; i < n; i++) dots.push({ path: p, color: path.color, x: (i - 1.5) * STEP, row: p });
  });
  return dots;
}
