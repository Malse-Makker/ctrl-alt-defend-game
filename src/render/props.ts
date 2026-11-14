// A small thing on the floor next to a tower for every path at tier 1 or 2: a tip jar when the
// Coffee Machine goes VENDING, a safety cone for HEALTH AND SAFETY. Tier 3 and 4 have a model of
// their own, so the prop goes then. Pure, so it can be tested without a scene.

import type { Tiers, TowerDef } from '../sim/data/towers';

export interface PathProp {
  path: number;
  model: string;
  /** Which side of the tower, seen from the camera. */
  side: 'left' | 'right';
}

export const propModel = (towerId: string, path: number): string => `prop_${towerId}_p${path}`;

export function pathProps(def: Pick<TowerDef, 'id' | 'paths'>, tiers: Tiers): PathProp[] {
  // The first path stands left, the third right, the second wherever the other one is not.
  // A side never changes when a path reaches tier 3 and drops its prop.
  const side = (p: number): PathProp['side'] => (p === 0 ? 'left' : p === 2 ? 'right' : tiers[0] > 0 ? 'right' : 'left');
  const out: PathProp[] = [];
  tiers.forEach((n, p) => {
    if (n > 0 && n <= 2 && def.paths[p]) out.push({ path: p, model: propModel(def.id, p), side: side(p) });
  });
  return out;
}
