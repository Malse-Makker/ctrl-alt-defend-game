// Path props: one small thing per path at tier 1 and 2, each on its own side.

import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MODEL_NAMES } from '../src/render/assets';
import { pathProps, propModel } from '../src/render/props';
import { TOWERS } from '../src/sim/data/towers';

const def = TOWERS.coffee;

describe('path props', () => {
  it('nothing on a tower without upgrades', () => {
    expect(pathProps(def, [0, 0, 0])).toEqual([]);
  });

  it('one prop per path at tier 1 and 2, each on its own side', () => {
    const props = pathProps(def, [2, 1, 0]);
    expect(props.map((p) => [p.path, p.side])).toEqual([
      [0, 'left'],
      [1, 'right'],
    ]);
    expect(props[0].model).toBe('prop_coffee_p0');
  });

  it('the prop goes at tier 3, and the other one stays where it was', () => {
    expect(pathProps(def, [3, 2, 0]).map((p) => [p.path, p.side])).toEqual([[1, 'right']]);
    expect(pathProps(def, [2, 0, 4]).map((p) => [p.path, p.side])).toEqual([[0, 'left']]);
  });

  it('a lone third path stands on the right, where it will stay', () => {
    expect(pathProps(def, [0, 0, 1])[0].side).toBe('right');
    expect(pathProps(def, [1, 0, 1]).map((p) => p.side)).toEqual(['left', 'right']);
  });

  it('every path of every tower has its prop, built and loaded', () => {
    const loaded = new Set<string>(MODEL_NAMES);
    for (const t of Object.values(TOWERS)) {
      t.paths.forEach((_, p) => {
        const m = propModel(t.id, p);
        expect(loaded.has(m), `${m} in MODEL_NAMES`).toBe(true);
        expect(existsSync(`public/models/${m}.glb`), `${m}.glb`).toBe(true);
      });
    }
  });
});
